var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "should create a product",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "4608bafddced65dda4a05b43083dad76",
        "instanceId": 12768,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00720082-00bc-008f-0037-000500830097.png",
        "timestamp": 1551968653762,
        "duration": 3546
    },
    {
        "description": "should create a productmeat",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0edadcbe09c72ef73d9e5120caaefeeb",
        "instanceId": 13656,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:22:29)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:18:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ae0062-00b8-0034-00d2-008b002d00e7.png",
        "timestamp": 1551969275384,
        "duration": 110
    },
    {
        "description": "should create a productvegetables",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0edadcbe09c72ef73d9e5120caaefeeb",
        "instanceId": 13656,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:22:29)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productvegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:18:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ac0065-0026-00bb-008b-00c600ee00c9.png",
        "timestamp": 1551969276131,
        "duration": 26
    },
    {
        "description": "should create a productbread",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0edadcbe09c72ef73d9e5120caaefeeb",
        "instanceId": 13656,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:22:29)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productbread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:18:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0071004c-00dc-00db-0059-007e00f90062.png",
        "timestamp": 1551969276470,
        "duration": 25
    },
    {
        "description": "should create a productpasta",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "0edadcbe09c72ef73d9e5120caaefeeb",
        "instanceId": 13656,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:22:29)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productpasta\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:18:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "003600f9-0037-007d-002e-00f00060000b.png",
        "timestamp": 1551969276815,
        "duration": 27
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cc85d5f7e4b5037ccf37e9da627fe88a",
        "instanceId": 14144,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a0001b-002d-0025-0094-008c00960026.png",
        "timestamp": 1551969578176,
        "duration": 8212
    },
    {
        "description": "should create a productvegetables|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cc85d5f7e4b5037ccf37e9da627fe88a",
        "instanceId": 14144,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007200aa-00ce-00e0-006c-000a00ca007e.png",
        "timestamp": 1551969587511,
        "duration": 3266
    },
    {
        "description": "should create a productbread|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cc85d5f7e4b5037ccf37e9da627fe88a",
        "instanceId": 14144,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008900f6-00e8-0051-00ce-00750087000f.png",
        "timestamp": 1551969591116,
        "duration": 2892
    },
    {
        "description": "should create a productpasta|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "cc85d5f7e4b5037ccf37e9da627fe88a",
        "instanceId": 14144,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00cb0036-0047-00d6-0076-00f200b700d6.png",
        "timestamp": 1551969594330,
        "duration": 2425
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ec50f8be36c9ec79c19fbd1cafcc3cec",
        "instanceId": 7600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: expect(...).toBeFalsey is not a function"
        ],
        "trace": [
            "TypeError: expect(...).toBeFalsey is not a function\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f10076-003c-006b-00a0-000700fa007a.png",
        "timestamp": 1551971188456,
        "duration": 2595
    },
    {
        "description": "should create a productvegetables|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ec50f8be36c9ec79c19fbd1cafcc3cec",
        "instanceId": 7600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: expect(...).toBeFalsey is not a function"
        ],
        "trace": [
            "TypeError: expect(...).toBeFalsey is not a function\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"should create a productvegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00230085-00e9-005b-0047-00bd007d00b5.png",
        "timestamp": 1551971191735,
        "duration": 1832
    },
    {
        "description": "should create a productbread|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ec50f8be36c9ec79c19fbd1cafcc3cec",
        "instanceId": 7600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: expect(...).toBeFalsey is not a function"
        ],
        "trace": [
            "TypeError: expect(...).toBeFalsey is not a function\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"should create a productbread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00490032-0084-00e7-003f-00a7000d0080.png",
        "timestamp": 1551971193903,
        "duration": 2010
    },
    {
        "description": "should create a productpasta|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ec50f8be36c9ec79c19fbd1cafcc3cec",
        "instanceId": 7600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: expect(...).toBeFalsey is not a function"
        ],
        "trace": [
            "TypeError: expect(...).toBeFalsey is not a function\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"should create a productpasta\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00860023-0006-0041-0050-006d00b700ee.png",
        "timestamp": 1551971196250,
        "duration": 1625
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "51754d676c27156d553b49b1431ff19b",
        "instanceId": 3464,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Expected true to be falsy."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "0090003c-00a4-00c5-0037-00d900ad00e4.png",
        "timestamp": 1551971730566,
        "duration": 3681
    },
    {
        "description": "should create a productvegetables|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "51754d676c27156d553b49b1431ff19b",
        "instanceId": 3464,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Expected true to be falsy."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "009b00d8-00de-0055-00a3-007000490094.png",
        "timestamp": 1551971734855,
        "duration": 3238
    },
    {
        "description": "should create a productbread|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "51754d676c27156d553b49b1431ff19b",
        "instanceId": 3464,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Expected true to be falsy."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "0000008a-00ba-0043-0019-007d008b0054.png",
        "timestamp": 1551971738452,
        "duration": 3147
    },
    {
        "description": "should create a productpasta|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "51754d676c27156d553b49b1431ff19b",
        "instanceId": 3464,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Expected true to be falsy."
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:64)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7"
        ],
        "browserLogs": [],
        "screenShotFile": "003900a5-00a0-0012-0056-00a000570091.png",
        "timestamp": 1551971741904,
        "duration": 2594
    },
    {
        "description": "should create a productmeat|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b6e329162dd6427926079e0eb19ee6b9",
        "instanceId": 14268,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\".mat-cell\", \"sausages\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".mat-cell\", \"sausages\")\n    at elementArrayFinder.getWebElements.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:49)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e700c4-000d-00c2-0068-00b000860008.png",
        "timestamp": 1551971803799,
        "duration": 2250
    },
    {
        "description": "should create a productvegetables|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b6e329162dd6427926079e0eb19ee6b9",
        "instanceId": 14268,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\".mat-cell\", \"carrots\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".mat-cell\", \"carrots\")\n    at elementArrayFinder.getWebElements.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:49)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productvegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "005c0021-0097-00f6-006b-00f8002f0044.png",
        "timestamp": 1551971806676,
        "duration": 1929
    },
    {
        "description": "should create a productbread|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b6e329162dd6427926079e0eb19ee6b9",
        "instanceId": 14268,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\".mat-cell\", \"bloomer\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".mat-cell\", \"bloomer\")\n    at elementArrayFinder.getWebElements.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:49)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productbread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "001c005c-008c-0041-0007-00ea00c5007c.png",
        "timestamp": 1551971808940,
        "duration": 1603
    },
    {
        "description": "should create a productpasta|productTests",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "b6e329162dd6427926079e0eb19ee6b9",
        "instanceId": 14268,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\".mat-cell\", \"spaghetti\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\".mat-cell\", \"spaghetti\")\n    at elementArrayFinder.getWebElements.then (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\User\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:20:49)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productpasta\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\User\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:17:5\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Suite.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:16:1)\n    at addSpecsToSuite (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\User\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\User\\mat-javascript-course\\test\\products\\product.spec.js:10:1)"
        ],
        "browserLogs": [],
        "screenShotFile": "00150082-0075-0000-00af-0083004d00d7.png",
        "timestamp": 1551971810870,
        "duration": 1990
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

