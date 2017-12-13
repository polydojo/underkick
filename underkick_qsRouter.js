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
var underkick_qsRouter = function (uk, $, _) {
    "use strict";
    
    uk.qsRouter = function () {
        // Prelims:
        var r = {}, p = {}; // Router & pvt container.
        p.animatedClassStr = (
            uk.config.qsRouter_animateCss ||
            uk.config.jsonRouter_animateCss ||              // (Backward) compatability with jsonRouter.
            ""// ||
        );
        
        p.oActiveApp = uk.observable(null);
        p.activeInfo = null;
        r.c = {};
        r.c.activeId = uk.computed(function () {
            var activeApp = p.oActiveApp.get(); 
            if (! activeApp) { return null; }   // Short ckt.
            // ==> A route (i.e. some route) is active.
            console.assert(activeApp.id, "uk-pushStateRouter: Assert than an active route must have an 'id'.");
            return activeApp.id;
        }, [p.oActiveApp]);
        
        window.document.head.innerHTML += (
            "<style>" +
                ".underkickRoute { display: none; }" +
                ".underkickRoute.underkickActiveRoute { display: block; }" +
            "</style>" //+
        );
        
        
        p.routeMap = {};    // { app_id: app_obj };
        r.register = function (app) {
            var el;
            el = document.getElementById(app.id);
            if (!el) {
                throw new Error("Route registration failed, id = " + JSON.stringify(app.id));
            }
            app.open = app.open || _.noop;      //uk.batchify(app.open || _.noop);         // Allow apps without an .open() method.
            app.close = app.close || _.noop;    //uk.batchify(app.close || _.noop);       // Allow apps without a .close() method.
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

        p.openHookList = [];
        r.addOpenHook = function (openHookFunc) {
            p.openHookList.push(openHookFunc);
        };
        // TODO: Make more hooks available.
        
        
        
        // Route manipulation and access:
        r.setInfoStr = function (infoStr) {
            var qMark_infoStr = null;
            if (infoStr.startsWith("?")) {
                qMark_infoStr = infoStr;
            } else {
                qMark_infoStr = "?" + infoStr;
            }
            history.pushState(null, null, qMark_infoStr);
            r.trigger();                                    // pushState() does NOT trigger 'popstate' event. We manually trigger routing.
            return null;
        };
        r.setInfo = function (info) {
            // Wrapper around r.setInfoStr, easier to use, used more often.
            var infoStr = uk.toQs(info);
            r.setInfoStr(infoStr);
            return null;
        };
        r.setId = function (id) {
            r.setInfo({id: id});
            return null;
        };
        r.getInfo = function () {
            "Return qs info if it makes sense. Else null."
            var infoStr, info;
            infoStr = location.search.slice(1);
            info = uk.parseQs(infoStr);
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
        p.onBadQs = function () {
            "Handles bad qs.";
            console.log("BAD QS: " + location.search);
            if (p.oActiveApp.get() && p.activeInfo) {
                // ==> There already is an active app => Set info to match activeInfo.
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
                // console.log("Doing noting as nextInfo === p.activeInfo.");
                return null;
            }
            if (p.oActiveApp.get()) {
                isItOkToClose = p.oActiveApp.get().close(nextInfo);     // See if it's ok to close the current app.
                if (isItOkToClose === false) {
                    // ==> .close() explicitly returned false => Restore activeInfo.
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
        p.onQsChange = function () {
            "Handles qs changes.";
            //console.log("qs: " + location.search);
            var nextInfo;
            nextInfo = r.getInfo();
            if (nextInfo === null) {
                // ==> Bad qs.
                p.onBadQs();
            } else {
                // ==> Good fragment.
                p.openNextApp(nextInfo);
            }
        };
        window.addEventListener("popstate", p.onQsChange);          // TODO: Wrap this in a new function, r.init().
        //window.addEventListener("load", p.onQsChange);
        r.trigger = function () {
            "Triggers router.js' onQsChange handler.";
            p.onQsChange();
        };
        r.back = function () {
            history.back();
            // TODO: Implement elaborate one-step histroy tracking.
            // This should not rely on window.history.
        };
        
        // Making clickable links work.
        p.onQsLinkClick = function (event) {
            var $a, infoStr, info;
            if (event.ctrlKey || event.metaKey) {
                return null;    // Short ckt.               // If Ctrl/Cmd/Super pressed, do NOT modify click-behaviour. Allow new-tab opens.
            }
            $a = $(event.currentTarget);
            infoStr = $a.attr("href").slice(1);
            info = uk.fromQs(infoStr);
            fd.router.setInfo(info);
            event.preventDefault();
        };
        $(uk.config.qsRouter_listenTarget || uk.config.listenTarget || "body").on(
            "click",
            "a[href^='?id=']",                              // Handler called only for links with href starting with "?id=".
            p.onQsLinkClick//,
        );
        
        r.ifRoute = function (routeId) {
            var activeApp = p.oActiveApp.get();
            if (activeApp && routeId === activeApp.id) {
                return "underkickRoute underkickActiveRoute" + " " + p.animatedClassStr;
            } else {
                return "underkickRoute";
            }
        };
        
        r.p = p;    // Debug line.
        return r;   // Export.
    };      
};
