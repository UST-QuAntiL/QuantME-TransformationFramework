/**
 * Copyright (c) 2021 Institute of Architecture of Application Systems -
 * University of Stuttgart
 *
 * This program and the accompanying materials are made available under the
 * terms the Apache Software License 2.0
 * which is available at https://www.apache.org/licenses/LICENSE-2.0.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable no-unused-vars*/
import React, { Fragment, PureComponent } from 'camunda-modeler-plugin-helpers/react';
import { Fill } from 'camunda-modeler-plugin-helpers/components';

import { startReplacementProcess } from '../replacement/QuantMETransformator';
import { configureBasedOnHardwareSelection } from '../replacement/hardware-selection/QuantMEHardwareSelectionHandler';
import { getServiceTasksToDeploy } from '../../deployment/services/DeploymentUtils';
import { getRootProcess } from '../Utilities';
import { createModelerFromXml } from '../replacement/ModelerGenerator';
import { createServiceInstance, uploadCSARToContainer } from '../../deployment/services/OpenTOSCAUtils';

export default class QuantMEController extends PureComponent {

  constructor(props) {

    super(props);

    // modelers for all tabs to enable switching between them
    this.modelers = {};

    // get QuantME component from the backend, e.g., to retrieve current QRMs
    this.quantME = props._getGlobal('quantME');

    // get API component from the backend, e.g., to send back results of long-running tasks
    this.api = props._getGlobal('api');
  }

  componentDidMount() {

    // initialize component with created modeler
    this.props.subscribe('bpmn.modeler.created', (event) => {

      const {
        modeler, tab
      } = event;

      // save modeler and activate as current modeler
      this.modelers[tab.id] = modeler;
      this.modeler = modeler;

      // subscribe to event bus to receive updates in the endpoints
      const self = this;
      this.eventBus = modeler.get('eventBus');
      this.eventBus.on('config.updated', function(config) {
        console.log(config);
        self.nisqAnalyzerEndpoint = config.nisqAnalyzerEndpoint;
        self.transformationFrameworkEndpoint = config.transformationFrameworkEndpoint;
        self.camundaEndpoint = config.camundaEndpoint;
        self.opentoscaEndpoint = config.opentoscaEndpoint;
        self.wineryEndpoint = config.wineryEndpoint;
      });

      // register actions to enable invocation over the menu and the API
      this.editorActions = modeler.get('editorActions');

      // transform the workflow passed through the API to a native workflow
      this.editorActions.register({
        transformWorkflow: async function(params) {
          console.log('Transforming workflow posted through API!');
          let currentQRMs = await self.quantME.getQRMs();
          let result = await startReplacementProcess(params.xml, currentQRMs,
            {
              nisqAnalyzerEndpoint: self.nisqAnalyzerEndpoint,
              transformationFrameworkEndpoint: self.transformationFrameworkEndpoint,
              camundaEndpoint: self.camundaEndpoint
            });

          // return result to API
          self.api.sendResult(params.returnPath, params.id, { status: result.status, xml: result.xml });
        }
      });

      // transform and deploy the workflow for the dynamic hardware selection
      this.editorActions.register({
        transformAndDeployWorkflow: async function(params) {
          console.log('Transforming and deploying workflow for hardware selection!');
          let currentQRMs = await self.quantME.getQRMs();

          // configure the workflow fragment with the given parameters
          console.log('Configuring workflow to transform using provider "%s", QPU "%s", and circuit language "%s"!',
            params.provider, params.qpu, params.circuitLanguage);
          let configurationResult = await configureBasedOnHardwareSelection(params.xml, params.provider, params.qpu, params.circuitLanguage);

          // forward error to API if configuration fails
          if (configurationResult.status === 'failed') {
            console.log('Configuration of given workflow fragment and parameters failed!');
            self.api.sendResult(params.returnPath, params.id, { status: configurationResult.status, xml: configurationResult.xml });
            return;
          }

          // transform to native BPMN
          let result = await startReplacementProcess(configurationResult.xml, currentQRMs,
            {
              nisqAnalyzerEndpoint: self.nisqAnalyzerEndpoint,
              transformationFrameworkEndpoint: self.transformationFrameworkEndpoint,
              camundaEndpoint: self.camundaEndpoint
            });

          // get all ServiceTasks that require a service deployment
          let modeler = await createModelerFromXml(result.xml);
          let csarsToDeploy = getServiceTasksToDeploy(getRootProcess(modeler.getDefinitions()));
          console.log('Found %i CSARs associated with ServiceTasks: ', csarsToDeploy.length, csarsToDeploy);

          // upload the CSARs to the OpenTOSCA Container
          for (let i = 0; i < csarsToDeploy.length; i++) {
            let csar = csarsToDeploy[i];
            let uploadResult = await uploadCSARToContainer(self.opentoscaEndpoint, csar.csarName, csar.url, self.wineryEndpoint);
            console.log('Uploaded CSAR \'%s\' to OpenTOSCA container with result: ', csar.csarName, uploadResult);

            // abort if upload is not successful
            if (uploadResult.success === false) {
              self.api.sendResult(params.returnPath, params.id, { status: 'failed', xml: result.xml });
              return;
            }
            csar.buildPlanUrl = uploadResult.url;
            csar.inputParameters = uploadResult.inputParameters;

            // create a service instance of the CSAR
            console.log('Successfully uploaded CSAR to OpenTOSCA Container. Creating service instance...');
            let instanceCreationResponse = await createServiceInstance(csar, self.camundaEndpoint);
            console.log('Creation of service instance of CSAR \'%s\' returned result: ', csar.csarName, instanceCreationResponse);

            // TODO: binding
          }

          // TODO: throw error if not successful and return endpoint for call activity
        }
      });

      // trigger initial QRM update
      this.quantME.updateQRMs().then(response => {
        console.log('Update of QRMs completed: ', response);
      }).catch(e => {
        self.props.displayNotification({
          type: 'warning',
          title: 'Unable to load QRMs',
          content: e,
          duration: 20000
        });
      });
    });

    // change to modeler corresponding to the active tab
    this.props.subscribe('app.activeTabChanged', ({ activeTab }) => {
      this.modeler = this.modelers[activeTab.id];
    });

    // remove corresponding modeler if tab is closed
    this.props.subscribe('app.closedTab', ({ tab }) => {
      delete this.modelers[tab.id];
    });
  }

  updateQRMs() {
    this.quantME.updateQRMs().then(response => {
      console.log('Update of QRMs completed: ', response);
    }).catch(e => {
      this.props.displayNotification({
        type: 'warning',
        title: 'Unable to load QRMs',
        content: e,
        duration: 20000
      });
    });
  }

  async transformWorkflow() {
    this.props.displayNotification({
      type: 'info',
      title: 'Workflow Transformation Started!',
      content: 'Successfully started transformation process for the current workflow!',
      duration: 7000
    });
    let xml = await this.modeler.get('bpmnjs').saveXML();
    let currentQRMs = await this.quantME.getQRMs();
    let result = await startReplacementProcess(xml.xml, currentQRMs,
      {
        nisqAnalyzerEndpoint: this.nisqAnalyzerEndpoint,
        transformationFrameworkEndpoint: this.transformationFrameworkEndpoint,
        camundaEndpoint: this.camundaEndpoint
      });

    if (result.status === 'transformed') {
      await this.modeler.get('bpmnjs').importXML(result.xml);
    } else {
      this.props.displayNotification({
        type: 'warning',
        title: 'Unable to transform workflow',
        content: result.cause,
        duration: 10000
      });
    }
  }

  render() {
    return <Fill slot="toolbar">
      <button type="button" className="src-app-primitives-Button__Button--3Ffn0" title="Update QRMs from repository"
        onClick={() => this.updateQRMs()}>
        <span className="qrm-reload"><span className="indent">Update QRMs</span></span>
      </button>
      <button type="button" className="src-app-primitives-Button__Button--3Ffn0" title="Transform the current workflow"
        onClick={() => this.transformWorkflow()}>
        <span className="workflow-transformation"><span className="indent">Transformation</span></span>
      </button>
    </Fill>;
  }
}
