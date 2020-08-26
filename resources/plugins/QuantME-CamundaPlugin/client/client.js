/**
 * Copyright (c) 2020 Institute for the Architecture of Application System -
 * University of Stuttgart
 *
 * This program and the accompanying materials are made available under the
 * terms the Apache Software License 2.0
 * which is available at https://www.apache.org/licenses/LICENSE-2.0.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerBpmnJSModdleExtension, registerBpmnJSPlugin } from 'camunda-modeler-plugin-helpers';
import ModdleExtension from '../resources/quantum4bpmn.json';
import customModule from '../quantme';
import replacementModule from '../replacement';

registerBpmnJSModdleExtension(ModdleExtension);

registerBpmnJSPlugin(customModule);

registerBpmnJSPlugin(replacementModule);
