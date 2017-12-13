//////////////////////////////////////////////////////////////////////////////
//                                                                          //
//  Copyright (C) 2017  Polydojo, Inc.                                      //
//                                                                          //
//  This Source Code Form is subject to the terms of the Mozilla Public     //
//  License, v. 2.0. If a copy of the MPL was not distributed with this     //
//  file, You can obtain one at http://mozilla.org/MPL/2.0/.                //
//                                                                          //
//////////////////////////////////////////////////////////////////////////////


// TODO: Add UMD support.
var underkick_modalComponent = function (uk, $, _) {
    "use strict";
    uk.modalComponent = function (id, submodel, bootboxConfig) {
        var bootbox;
        if (! uk.config.bootbox) {
            throw new Error("underkick_modalComponent: Bootbox not found. Should be supplied via underkick({.. 'bootbox': bootbox, ...})");
        }
        bootbox = uk.config.bootbox;
        // ==> `bootbox` is available.
        bootboxConfig = bootboxConfig || {};
        return bootbox.dialog(_.extend({}, {
            "message": uk.component(id, submodel),
            "onEscape": true,   // 'esc' key => close.
            "backdrop": true,   // Click outside => close.  (This depends on 'onEscape' being truthy. See docs for more.)
        }, bootboxConfig));
    };
};
