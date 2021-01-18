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

const { Router } = require('express');
const router = Router();

// TODO: implement required routes
router.get('/', (req, res) => {
  res.json({ '_links': {
    'self': { method: 'GET', href: req.header('host') + '/quantme' },
    'qrms': { method: 'GET', title: 'Get all available QRMs', href: req.header('host') + '/quantme/qrms' },
    'update-qrms': { method: 'POST', title: 'Reload the available QRMs form the specified repository', href: req.header('host') + '/quantme/qrms' }
  } });
});

module.exports = router;
