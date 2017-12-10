/*
    TimeNinja: A simple app for time tracking.
    Copyright (C) 2017  Polydojo, Inc.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


// XXX: v0: Skeleton app, with no javascript.

var tn = {"APP_NAME": "TimeNinja"};     // APP SCOPE & UNDERKICK MODEL
var uk = underkick();                   // UNDERKICK INSTANCE

// XXX: v0 to v1: Render first (hello-world) template.
// uk.render(tn, "source-template", "render-target", "tn");

// XXX: v1 to v2: Setup tab-divs.

// XXX: v2 to v3: Setup fragment-based routing. MISC.

// Routing:
tn.router = (function () {
    var r = {"DEFAULT_ID": "tracker", "o": {}};
    r.o.activeId = uk.observable("");
    r.onHashChange = function () {
        var activeId = location.hash.slice(1) || r.DEFAULT_ID;
        r.o.activeId(activeId);
    };
    $(window).on("hashchange", r.onHashChange);
    r.onHashChange();                                       // Simulates 'hashchange', captures location.hash in r.o.activeId().
    return r;
}());

// MISC:

tn.getUniqueId = function () {
    return (_.now() + "" + Math.random()).replace("0.", "-");
};

tn.formatTimeDelta = function (ms) {
    var s = 0, m = 0, h = 0;
    s = Math.round(ms/1000);
    while (s >= 60) {
        m += 1;
        s -= 60;
    }
    while (m >= 60) {
        h += 1;
        m -= 60;
    }
    return [h + "h", m + "m", s + "s"].join(" ");
};

tn.formatTimestamp = function (ms) {
    return new Date(ms).toString().slice(4, 24);
};

// XXX: Introduce the idea of tracking.

// Tracking:
tn.tracker = (function () {
    var t = {"o": {}, "c": {}};
    
    t.o.startTime = uk.observable(null);                    // The time at which the timer was started.
    t.o.now = uk.observable(_.now());                       // The current time. (Precision is 1 second.)
    t.o.project = uk.observable(null);                      // The project being currently tracked (or edited.)
    t.o.task = uk.observable(null);                         // The task being currently tracked (or edited.)
    t.o.hourlyCharge = uk.observable(null);                 // The houly charge for the task being currently tracked (or edited.)
    t.o.activityList = uk.observableArray([]);              // List of tracked activities. (Time sheet.)
    // Following observables relate to activity editing.
    t.o.idUnderEdit = uk.observable(null);                  // The id of the activity currently being edited.
    t.o.minuteCount = uk.observable(null);                  // Helps edit an activity's duration.
    t.o.startDateStr = uk.observable(null);                 // Helps edit an activity's starting time.
    
    setInterval(function () { t.o.now(_.now()); }, 1000);
    
    t.c.mode = uk.computed(function () {
        if (!! t.o.startTime()) { return "tracking"; }
        if (!! t.o.idUnderEdit())  { return "editing"; }
        return "still";
    }, [t.o.startTime, t.o.idUnderEdit]);
    
    t.c.trackedTime = uk.computed(function () {
        if (! t.o.startTime()) { return 0; }
        return  Math.max(0, t.o.now() - t.o.startTime());
    }, [t.o.startTime, t.o.now]);
    
    t.c.trackedCharge = uk.computed(function () {
        return (t.c.trackedTime() / (1000 * 3600) * t.o.hourlyCharge()) || 0;
    }, [t.c.trackedTime, t.o.hourlyCharge]);
    
    // XXX: v3 to v4: Setup tracking form and stop-tracking button. (Also, start counting no. of activities.)
    
    t.onSubmit_tracking = function (submissionEvent) {
        if (t.c.mode() === "still") {
            // New activity. Start tracking:
            t.startTracking(submissionEvent);
        } else if (t.c.mode() === "editing") {
            // Updating existing activity:
            t.updateActivity(submissionEvent);
        } else {
            throw new Error("Tracker: Unknown mode.");
        }
    };
    
    t.startTracking = function (submissionEvent) {
        var tgt = submissionEvent.target;
        t.o.project(tgt.project.value);
        t.o.task(tgt.task.value);
        t.o.hourlyCharge(Number(tgt.hourlyCharge.value) || 0);
        t.o.startTime(_.now());
    };
    
    t.onClick_stopTracking = function () {
        var activity = {
            "id": tn.getUniqueId(),
            "project": t.o.project(),
            "task": t.o.task(),
            "startTime": t.o.startTime(),
            "hourlyCharge": Number(t.o.hourlyCharge()) || 0,
        };
        t.o.startTime(null);
        activity.spentTime = _.now() - activity.startTime;
        activity.charge = activity.spentTime / (1000 * 3600) * activity.hourlyCharge;
        t.o.activityList.unshift(activity);
        // Clear task:
        t.o.task("");
    };
    
    // XXX: v4 to v5: Setup a table for viewing timesheet.
    
    // XXX: v5 to v6: Improve tracking form and stop-tracking button.
    
    // XXX: v6 to v7: Allowing users to edit, delete and manually enter activities.

    t.onClick_editActivity = function (activity, __event) {
        t.o.idUnderEdit(activity.id);
        t.o.project(activity.project);
        t.o.task(activity.task);
        t.o.hourlyCharge(activity.hourlyCharge);
        t.o.minuteCount(Math.round(activity.spentTime / (1000 * 60)));
        t.o.startDateStr(new Date(activity.startTime).toString().slice(4, 24));
        if (tn.router.o.activeId !== "tracker") {
            location.hash = "tracker";
        }
        _.defer(function () {
            $("header").get(0).scrollIntoView();
        });
    };
    
    t.updateActivity = function (submissionEvent) {
        var tgt, id, activity, minuteCount, spentTime, startTime;
        tgt = submissionEvent.target;
        id = tgt.idUnderEdit.value;
        activity = _.findWhere(t.o.activityList(), {"id": id});
        minuteCount = Number(tgt.minuteCount.value) || 0;
        startTime = new Date(tgt.startDateStr.value).getTime();
        if (_.isNaN(startTime)) {
            alert("That date is invalid. Please follow the specified format.");
            return null;
        }
        spentTime = minuteCount * (60 * 1000);
        hourlyCharge = Number(tgt.hourlyCharge.value) || 0;
        charge = spentTime / (1000 * 3600) * hourlyCharge;
        activity = _.extend(activity, {
            "project": tgt.project.value,
            "task": tgt.task.value,
            "startTime": startTime,
            "hourlyCharge": hourlyCharge, 
            "spentTime": spentTime,
            "charge": charge,
        });
        t.o.activityList(t.o.activityList());               // Set by reference, will cause re-rendering (for non-primitive objects).
        t.o.idUnderEdit(null);
        // Clear task:
        t.o.task("");
    };
    
    t.onClick_deleteActivity = function (activity) {
        t.o.activityList.without(activity);
    };
    
    t.onClick_manualEntry = function () {
        var activity;
        t.startTracking({"target": {
            "project": {"value": ""},
            "task": {"value": ""},
            "hourlyCharge": {"value": 0},
        }});
        t.onClick_stopTracking();
        activity = t.o.activityList()[0];
        t.onClick_editActivity(activity);
    };
    
    return t;
}());

// XXX: v7 to v8: Data syncing w/ localStorage & import/export.

// Data Syncing:
tn.syncer = (function () {
    var s = {};
    s.getAppState = function () {
        return {
            "activityList": tn.tracker.o.activityList(),
        }
    };
    s.saveAppState = function () {
        localStorage.setItem(tn.APP_NAME, uk.toPrettyJson(s.getAppState()));
    };
    s.loadAppState = function (appStateJson, successCallback) {
        var appState;
        successCallback = successCallback || _.noop;
        try {
            appState = JSON.parse(appStateJson);
            tn.tracker.o.activityList(appState.activityList);
            successCallback(appState);
        } catch (e) {
            console.log(e);
        }
    };
    s.onSubmit_syncData = function (event) {
        s.loadAppState(event.target.newAppStateJson.value, function () {
            alert("Great! Data loaded!");
        });
    };
    uk.onRender(s.saveAppState);
    if (localStorage.getItem(tn.APP_NAME)) {
        s.loadAppState(localStorage.getItem(tn.APP_NAME));  // Loads app data from localStorage.
    }
    return s;
}());

// XXX: v8 to v9: Creating a component for rendering timesheet.

// XXX: v9 to final: Implementing filters using two-way bindings.

// (Filtered) Viewer
tn.viewer = (function () {
    var v = {"o": {}, "c": {}};
    
    v.o.project = uk.observable(null);                      // The project, by which we should filter.
    v.o.task = uk.observable(null);                         // The task, by which we should filter.
    v.o.fromDateStr = uk.observable(null);                  // Starting date of the date range to filter by.
    v.o.toDateStr = uk.observable(null);                    // End date of the date range to filter by.
    
    v.o.sortBy = uk.observable(null);                       // The property to sort by. Sort by project? Sort by task? etc.
    v.o.sortOrder = uk.observable(null);                    // The order to sort in. Ascending or descending?
    
    v.sortBy_optionList = ["project", "task", "startTime", "charge"];
    v.sortOrder_optionList = ["Ascending", "Descending"];
    
    v.c.fromTime = uk.computed(function () {
        return new Date(v.o.fromDateStr()).getTime();
    }, [v.o.fromDateStr]);
    
    v.c.toTime = uk.computed(function () {
        return new Date(v.o.toDateStr()).getTime();
    }, [v.o.toDateStr]);
    
    v.c.activityList = uk.computed(function () {
        var activityList = _.filter(tn.tracker.o.activityList(), function (activity) {
            return _.all([
                (! v.o.project()) || activity.project === v.o.project(),
                (! v.o.task()) || activity.task === v.o.task(),
                (! v.c.fromTime()) || v.c.fromTime() < activity.startTime,
                (! v.c.toTime()) || activity.startTime < v.c.toTime(),
            ]);
        });
        if (v.o.sortBy()) {
            activityList = _.sortBy(activityList, v.o.sortBy());
            if (v.o.sortOrder() === "Descending") {
                activityList = activityList.reverse();
            }
        }
        return activityList;
    }, [
        tn.tracker.o.activityList, v.o.project, v.o.task,
        v.c.fromTime, v.c.toTime, v.o.sortBy, v.o.sortOrder,
    ]);
    
    v.c.totalCharge = uk.computed(function () {
        return _.reduce(v.c.activityList(), function (sum, activity) {
            return sum + activity.charge;
        }, 0);
    }, [v.c.activityList]);
    
    return v;
}());

uk.render(tn, "source-template", "render-target", "tn");
