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

const root = require('./root-controller');
const workflow = require('./workflow-controller');
const quantme = require('./quantme-controller');
const qrm = require('./qrm-controller');

module.exports = {
  root,
  workflow,
  quantme,
  qrm
};
