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

// script to invoke the hardware selection by the NISQ Analyzer based on the circuit created in the workflow
export var INVOKE_NISQ_ANALYZER_SCRIPT= 'import groovy.json.*\n' +
  '\n' +
  'def nisqAnalyzerEndpoint = execution.getVariable("nisq_analyzer_endpoint");\n' +
  'def circuitLanguage = execution.getVariable("circuit_language");\n' +
  'def quantumCircuit = execution.getVariable("quantum_circuit");\n' +
  '\n' +
  'if(nisqAnalyzerEndpoint == null || circuitLanguage == null || quantumCircuit == null){\n' +
  '   throw new org.camunda.bpm.engine.delegate.BpmnError("Nisq Analyzer endpoint, quantum circuit, and circuit language must be set!");\n' +
  '}\n' +
  '\n' +
  'def simulatorsAllowed = execution.getVariable("simulators_allowed");\n' +
  'if(simulatorsAllowed == null){\n' +
  '   simulatorsAllowed = "false";\n' +
  '}\n' +
  '\n' +
  'def allowedProvidersList = [];\n' +
  'if(execution.getVariable("providers") != null){\n' +
  '   allowedProvidersList = execution.getVariable("providers").split(",");\n' +
  '}\n' +
  '\n' +
  'def tokens = [:];\n' +
  'for (Object item : execution.getVariables().entrySet() ){\n' +
  '   def key = item.getKey();\n' +
  '   if(key.startsWith("token_")) {\n' +
  '       def provider = key.split("_")[1];\n' +
  '       tokens.putAt(provider, item.getValue());\n' +
  '   }\n' +
  '}\n' +
  '\n' +
  'def circuitUrl = execution.getVariable("camunda_endpoint");\n' +
  'circuitUrl = circuitUrl.endsWith("/") ? circuitUrl : circuitUrl + "/";\n' +
  'circuitUrl += "process-instance/" + execution.getProcessInstanceId() + "/variables/quantum_circuit/data";\n' +
  'def message = JsonOutput.toJson(["circuitUrl": circuitUrl, "simulatorsAllowed": simulatorsAllowed, "circuitLanguage": circuitLanguage, "tokens": tokens, "allowedProviders": allowedProvidersList]);\n' +
  'println "Sending message: " + message;\n' +
  '\n' +
  'try {\n' +
  '   def post = new URL(nisqAnalyzerEndpoint).openConnection();\n' +
  '   post.setRequestMethod("POST");\n' +
  '   post.setDoOutput(true);\n' +
  '   post.setRequestProperty("Content-Type", "application/json");\n' +
  '   post.setRequestProperty("accept", "application/json");\n' +
  '   post.getOutputStream().write(message.getBytes("UTF-8"));\n' +
  '\n' +
  '   def status = post.getResponseCode();\n' +
  '   if(status == 200){\n' +
  '       def resultText = post.getInputStream().getText();\n' +
  '       def slurper = new JsonSlurper();\n' +
  '       def json = slurper.parseText(resultText);\n' +
  '       def jobUrl = json.get("_links").get("self").get("href");\n' +
  '       println "NISQ Analyzer invocation resulted in the following job URL: " + jobUrl;\n' +
  '       execution.setVariable("nisq_analyzer_job_url", jobUrl);\n' +
  '   }else{\n' +
  '       throw new org.camunda.bpm.engine.delegate.BpmnError("Received status code " + status + " while invoking NISQ Analyzer!");\n' +
  '   }\n' +
  '} catch(org.camunda.bpm.engine.delegate.BpmnError e) {\n' +
  '   println e.errorCode;\n' +
  '   throw new org.camunda.bpm.engine.delegate.BpmnError(e.errorCode);\n' +
  '} catch(Exception e) {\n' +
  '   println e;\n' +
  '   throw new org.camunda.bpm.engine.delegate.BpmnError("Unable to connect to given endpoint: " + nisqAnalyzerEndpoint);\n' +
  '}';

export var SELECT_ON_QUEUE_SIZE_SCRIPT= 'import groovy.json.*\n' +
  '\n' +
  'def pollingUrl = execution.getVariable("nisq_analyzer_job_url");\n' +
  'println "Polling for NISQ Analyzer results at URL: " + pollingUrl\n' +
  'def ready = false;\n' +
  'def resultList = [];\n' +
  'while(ready == false) {\n' +
  '   println "Waiting 10 seconds for next polling request to the NISQ Analyzer at URL: " + pollingUrl\n' +
  '   sleep(10000)\n' +
  '   def get = new URL(pollingUrl).openConnection();\n' +
  '   get.setRequestMethod("GET");\n' +
  '   get.setDoOutput(true);\n' +
  '\n' +
  '   def status = get.getResponseCode();\n' +
  '   if(status != 200){\n' +
  '       throw new org.camunda.bpm.engine.delegate.BpmnError("Received invalid status code during polling: " + status);\n' +
  '   }\n' +
  '   def resultText = get.getInputStream().getText();\n' +
  '   def slurper = new JsonSlurper();\n' +
  '   def json = slurper.parseText(resultText);\n' +
  '   ready = json.get("ready");\n' +
  '   if(ready == true){\n' +
  '       resultList = json.get("qpuSelectionResultList");\n' +
  '   }\n' +
  '}\n' +
  '\n' +
  'println "NISQ Analyzer job changed status to ready!"\n' +
  'println "Received " + resultList.size + " possible QPUs for the execution...";\n' +
  '\n' +
  'if(resultList.size == 0){\n' +
  '   throw new org.camunda.bpm.engine.delegate.BpmnError("Found no suitable QPU, aborting!");\n' +
  '}\n' +
  '\n' +
  'def sortedList = resultList.sort { it.queueSize };\n' +
  'println sortedList;\n';

// TODO: select QPU with shortest queue, retrieve provider, QPU, language and circuit

// TODO
export var INVOKE_TRANSFORMATION_SCRIPT= 'println "Test"';
