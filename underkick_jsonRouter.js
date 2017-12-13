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
var underkick_jsonRouter = function (uk, _$, __) {
    "use strict";
    
    uk.jsonRouter = function () {
        // Prelims:
        var r = {}, p = {}; // Router & pvt container.
        p.animatedClassStr = uk.config.jsonRouter_animateCss || "";
        
        p.oActiveApp = uk.observable(null);
        p.activeInfo = null;
        r.c = {};
        r.c.activeId = uk.computed(function () {
            var activeApp = p.oActiveApp.get(); 
            if (! activeApp) { return null; }   // Short ckt.
            // ==> A route (i.e. some route) is active.
            console.assert(activeApp.id, "uk-jsonRouter: Assert than an active route must have an 'id'.");
            return activeApp.id;
        }, [p.oActiveApp]);
        
        window.document.head.innerHTML += (
            "<style>" +
                ".underkickRoute { display: none; }" +
                ".underkickRoute.underkickActiveRoute { display: block; }" +
            "</style>" //+
        );
        
        p.equalJSON = function (objA, objB) {
            return JSON.stringify(objA) === JSON.stringify(objB);
        };
        p.noop = function () { return null; };
        
        p.routeMap = {};    // { app_id: app_obj };
        r.register = function (app) {
            var el;
            el = document.getElementById(app.id);
            if (!el) {
                throw new Error("Route registration failed, id = " + JSON.stringify(app.id));
            }
            app.open = app.open || p.noop;      //uk.batchify(app.open || p.noop);         // Allow apps without an .open() method.
            app.close = app.close || p.noop;    //uk.batchify(app.close || p.noop);       // Allow apps without a .close() method.
            //console.log("Registering route " + app.id);
            p.routeMap[app.id] = app;
            //console.log("p.routeMap[app.id] = " + p.routeMap[app.id]);
            if (! p.defaultApp) {
                p.defaultApp = app;
            }
            //console.log("Registered route: " + app.id);
        };
        r.autoRegister = function () {
            var routeEls;
            routeEls = document.getElementsByClassName("underkickRoute");
            routeEls = Array.prototype.slice.call(routeEls);
            //console.log("routeEls = " + fd.pretty(routeEls));
            routeEls.forEach(function (el) {
                //console.log("Auto-registering route " + el.id);
                if (! p.routeMap[el.id]) {
                    r.register({id: el.id});
                }
            });
        };

        /*
        // Hooks:
        p.hook = {};
        //p.hook.open = p.noop;
        //p.hook.close = p.noop;
        p.hook.hashchange = p.noop;
        r.hook = function (name, func) {
            name = name.toLowerCase();
            /*if (name === "open") {
                p.hookOpen = func;
            } else if (name === "close") {
                p.hookClose = func;
            } else*x/ if (name === "hashchange") {
                p.hook.hashchange = func;
            }
        };*/
        
        p.openHookList = [];
        r.addOpenHook = function (openHookFunc) {
            p.openHookList.push(openHookFunc);
        };
        // TODO: Make more hooks available.
        
        
        
        // Route manipulation and access:
        r.setId = function (id) {
            r.setInfo({id: id});
        };
        r.setInfo = function (info) {
            var infoStr, infoFrag;
            infoStr = JSON.stringify(info);
            //infoFrag = encodeURIComponent(infoStr);           // Production line
            infoFrag = infoStr;                                 // Debug line
            location.hash = infoFrag;
            return null;
        };
        r.getInfo = function () {
            "Return hash info if it makes sense. Else null."
            var infoStr, infoFrag, info;
            infoFrag = location.hash.slice(1);
            infoStr = decodeURIComponent(infoFrag);
            try {
                info = JSON.parse(infoStr);
            } catch (e) {
                return null;
            }
            if (info && info.id && p.routeMap[info.id]) {
                return info;
            } else {
                return null;
            }
        };
        r.openDefault = function (moreInfo/*={}*/) {
            var defaultId;
            defaultId = p.defaultApp.id;
            moreInfo = moreInfo || {}
            r.setInfo($.extend({}, moreInfo, {id: defaultId}));
        };
        
        // App routing:    
        p.onBadHash = function () {
            "Handles bad hash fragments.";
            console.log("BAD HASH: " + location.hash);
            if (p.oActiveApp.get() && p.activeInfo) {
                // ==> There already is an active app => Set hashInfo to match activeInfo.
                r.setInfo(p.activeInfo);
                // Note: This shouldn't (and doesn't) re-trigger the active app's .open().
                // Ref. commandment: Thou shall not re-trigger an already-open-app's .open() method.
            } else {
                // ==> No app currently active => Open default app.
                r.setInfo({id: p.defaultApp.id});
            }
            return null;
        };
        p.openNextApp = function (nextInfo) {
            "Blindly opens the app identified by `nextInfo`.";
            var nextApp, isItOkToClose;
            nextApp = p.routeMap[nextInfo.id];
            if (uk.haveSameJson(nextInfo, p.activeInfo)) {
                // ==> No effective change => Do nothing.
                // Commandment: Thou shall not re-trigger an already-open-app's .open() method.
                return null;
            }
            if (p.oActiveApp.get()) {
                isItOkToClose = p.oActiveApp.get().close(nextInfo);     // See if it's ok to close the current app.
                if (isItOkToClose === false) {
                    // ==> .close() explicitly returned false => Repair hash to match activeInfo.
                    r.setInfo(p.activeInfo); // This will trigger another call to p.openNextApp. In that call, we won't call .open().
                    // TODO: Contemplate replacing `r.setInfo(p.activeInfo)` by `history.back()`.
                    return null;
                }
            }
            // ==> Current app, if any, can be closed. Now, we first update router state and then open the `nextApp`.
            // Update router state:
            p.oActiveApp.set(nextApp);
            p.activeInfo = nextInfo;
            // Open next app:
            nextApp.open(nextInfo);
            // Fire postOpen hooks:
            _.each(p.openHookList, function (onOpenHook) {
                onOpenHook(nextInfo);
            });
            //  Note:
            //  By updating the router's state first, the nextApp's UI is made visible __before__ calling nextApp.open().
            //  The nextApp's .open() function can hence __rely__ on being able to manipulate it's UI.
            //  This becomes especially pertinant if a non-underkick manipulation like $(.).fadeOut() needs to be used.
            
        };
        p.onHashChange = function () {
            "Handles hash changes.";
            var nextInfo;
            //p.hook.hashchange();                    // Fire hook.hashchange(). -- DEPRECATED.
            nextInfo = r.getInfo();
            if (nextInfo === null) {
                // ==> Bad fragment.
                p.onBadHash();
            } else {
                // ==> Good fragment.
                p.openNextApp(nextInfo);
            }
        };
        window.addEventListener("hashchange", p.onHashChange);          // TODO: Wrap this in a new function, r.init().
        //window.addEventListener("load", p.onHashChange);
        r.trigger = function () {
            "Triggers router.js' hashchange handler.";
            p.onHashChange();
        };
        r.back = function () {
            history.back();
            // TODO: Implement elaborate one-step histroy tracking.
            // This should not rely on window.history.
        };

        
        r.ifRoute = function (routeId) {
            var activeApp = p.oActiveApp.get();
            if (activeApp && routeId === activeApp.id) {
                return "underkickRoute underkickActiveRoute" + " " + p.animatedClassStr;
            } else {
                return "underkickRoute";
            }
        };
        
        r.reAnimate = function () {                         // --UNUSED, IMPERFECT, not predictable. Works only sometimes.
            var activeApp, $activeDiv;
            console.assert(p.animatedClassStr, "Assert that config option 'jsonRouter_animateCss' was supplied and is truthy.");
            activeApp = p.oActiveApp.get();
            console.assert(activeApp && activeApp.id, "router.reAnimate(): Assert that a route is currently active.");
            $activeDiv = $("#" + activeApp.id);
            $activeDiv.removeClass(p.animatedClassStr);
            _.defer(function () {
                $activeDiv.addClass(p.animatedClassStr);
            });
        };
        
        r.p = p;    // Debug line.
        return r;   // Export.
    };      
};
