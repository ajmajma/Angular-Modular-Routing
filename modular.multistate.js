require.config({
    paths: {
        'angular': '//static.mindtap.modular.com/thirdparty/angular/1.3.4/angular.min',
        'lodash': '/bower_components/lodash/lodash.min'
    },
    shim: {
        'angular': {
            exports: 'angular'
        },
        'lodash': {
            exports: '_'
        }
    }
});

define([],
    function() {define('modular.multistate/state-model',['angular',
        'lodash'
    ],
    function modularmultistateStateModel(angular, lodash) {
        var metadata = {
            componentName: 'ModularStateModel',
            moduleName: 'modular.multistate.ModularStateModel'
        };

        angular.module(metadata.moduleName, []).factory(metadata.componentName, [
            "$log",
            function($log) {

                function StateModelInstance(state, stateVars) {
                    this.name = state;
                    this.vars = stateVars || [];
                }

                StateModelInstance.prototype = {
                    //validate requested state/stateParams
                    canGo: function(stateVars) {
                        if (stateVars) {
                            return this.vars.length === stateVars.length;
                        } else if (this.vars.length) {
                            return false;
                        }
                    }
                };

                return StateModelInstance;

            }
        ]);

        return metadata;
    }
);

define('modular.multistate/module-model',['angular',
        'lodash',
        'modular.multistate/state-model'
    ],
    function multistateModelConstructor(angular, lodash, stateModelMain) {
        var metadata = {
            componentName: 'ModularModuleModel',
            moduleName: 'modular.multistate.ModularModuleModel'
        };
        //global currentModules
        var currentModules = {};

        angular.module(metadata.moduleName, [
                stateModelMain.moduleName
            ])
            .factory(metadata.componentName, ['$rootScope', '$log', stateModelMain.componentName,
                function($rootScope, $log, CengaStateModel) {

                    function ModuleModelInstance(name, callback) {
                        this.currentState = undefined;
                        this.states = {};

                        ModuleModelInstance.getModule = function(name) {
                            if (currentModules[name]) {
                                return currentModules[name];
                            } else {
                                return undefined;
                            }
                        };

                        ModuleModelInstance.getAllModules = function() {
                            return currentModules;
                        };

                        if (currentModules[name]) {
                            $log.warn(name + " module already exists.");
                        } else {
                            this.currentState = {};
                            this.callback = callback;
                            this.rootScope = $rootScope.$id;
                            _.extend(currentModules, _.object([name], [this]));
                        }

                    }

                    ModuleModelInstance.prototype = {
                        //add New State to module
                        addState: function(state, stateVars) {
                            if (this.states[state]) {
                                throw new Error("State '" + state + "' already defined.");
                            }
                            this.states[state] = new CengaStateModel(state, stateVars);
                            return this;
                        },
                        canGo: function(state) {
                            return this.states[state] !== undefined;
                        },
                        setCurrent: function(state, stateVars) {
                            // && this.states[state].canGo(stateVars) fails if no stateVars
                            if (this.canGo(state) && this.states[state].canGo(stateVars)) {
                                this.currentState = _.object([
                                    [state, stateVars]
                                ]);
                                return true;
                            } else {
                                return false;
                            }
                        }
                    };

                    return ModuleModelInstance;
                }
            ]);

        return metadata;
    });

define('modular.multistate/state-route',['angular',
        'lodash',
        'modular.multistate/module-model'
    ],
    function multistateRoute(angular, lodash, moduleModelMain) {
        var metadata = {
            componentName: 'modularMultistateRoute',
            moduleName: 'modular.multistate.modularMultistateRoute'
        };

        angular.module(metadata.moduleName, [
            moduleModelMain.moduleName
        ]).factory(metadata.componentName,
            /* @ngInject */
            ['$rootScope', '$location', '$log', 'ModularModuleModel', function($rootScope, $location, $log, ModularModuleModel) {
                //factory for dealing with url
                return {
                    /*
                     * Request the url change
                     * checks if current url is empty first
                     */
                    requestUrl: function(name, stateName, options) {

                        var currentUrl = $location.search();
                        var temp2 = _.object([
                            [name, _.object([
                                [stateName, options]
                            ])]
                        ]);
                        temp2 = this.parseObjectToUrl(temp2);
                        _.extend(currentUrl, temp2);
                        $location.search(currentUrl);
                    },
                    /*
                     * Encode/parse object to format for URL ($location.search())
                     */
                    parseObjectToUrl: function(obj) {
                        function helper(o) {
                            var key = Object.keys(o)[0];
                            return [].concat(key, o[key]).map(parseString).join(',');
                        }

                        function parseString(str) {
                            return encodeURIComponent(decodeURIComponent(str));
                        }
                        var newObj = {};
                        var prop;
                        for (prop in obj) {
                            if (obj.hasOwnProperty(prop)) {
                                newObj[parseString(prop)] = helper(obj[prop]);
                            }
                        }
                        return newObj;
                    },
                    /*
                     * Decode/parse from URL format to object
                     */
                    parseObjectFromUrl: function(url) {
                        //parse segment from url so we can call a gostate in the locationchange
                        var parseURL = {};
                        var tempSplit = url.split(",");
                        var objKey = decodeURIComponent(tempSplit[0]);
                        var objValue = tempSplit.slice(1);
                        for (var i in objValue) {
                            decodeURIComponent(i);
                        }
                        parseURL[objKey] = objValue;
                        return parseURL;
                    },
                    /*
                     *  fires a state change from module
                     */
                    goState: function(name, stateName, options) {
                        //double check module exists
                        if (ModularModuleModel.getModule(name) !== undefined) {
                            window.modularMultistateGoState = true;
                            this.prepState(name, stateName, options);
                        } else {
                            $log.error("Requested module (" + name + ") could not be found at this time.");
                        }
                    },
                    /*
                     *  State change for locationchangesuccess listener
                     */
                    loadStates: function(name, stateName, options) {
                        //check if is loaded module, then change and fire callback
                        if (ModularModuleModel.getModule(name) !== undefined) {
                            this.prepState(name, stateName, options);

                        } else {
                            var bindForCheck = this.prepState.bind(this);

                            //module cannot be found check for 5 seconds
                            $log.warn("Requesting " + name + "...");
                            var timeToCheck = true;
                            setTimeout(function() {
                                timeToCheck = false;
                            }, 5000);
                            var check = {
                                init: function() {
                                    check.checkAgain();
                                },
                                checkAgain: function() {
                                    if (timeToCheck) {
                                        if (ModularModuleModel.getModule(name) !== undefined) {
                                            bindForCheck(name, stateName, options);
                                        } else {
                                            //still doesn't exists
                                            setTimeout(check.checkAgain, 200);
                                        }
                                    } else {
                                        //doesn't exist after 5 seconds
                                        $log.error("Requested module (" + name + ") could not be found at this time.");
                                    }
                                }
                            };
                            check.init();
                        }

                    },
                    prepState: function(name, stateName, options) {
                        var currentModule = ModularModuleModel.getModule(name);
                        if (currentModule !== undefined) {

                            //set currentstate to same string as url for easy comparrisons
                            var setCurrent = {};
                            var setNew = {};
                            name = decodeURIComponent(name);

                            //set rootScopeID in window to check against
                            window.modularMultistateRootscope = $rootScope.$id;

                            //prevent late loading modules firing under wrong rootscope
                            if ($rootScope.$id === currentModule.rootScope) {

                                setCurrent = _.object([
                                    [name, _.object([
                                        [stateName, options]
                                    ])]
                                ]);
                                setNew = this.parseObjectToUrl(setCurrent);
                                //if valid will return true and change models current state
                                if (currentModule.setCurrent(stateName, options)) {
                                    var stateIs = _.object(currentModule.states[stateName].vars, options);
                                    //fire callback for module
                                    currentModule.callback(stateName, stateIs);
                                    //request the url change
                                    this.requestUrl(name, stateName, options);
                                }
                            }

                        } else {
                            //throw error
                            $log.error("Requested Module exists, but state does not.");
                        }
                    }
                };
            }]);

        return metadata;
    }
);

define('modular.multistate/main',[
        'angular',
        'modular.multistate/module-model',
        'modular.multistate/state-route'
    ],
    function(angular, moduleModelMain, multistateRouteMain) {
        var metadata = {
            moduleName: 'modular.multistate'
        };
        angular.module(metadata.moduleName, [
                moduleModelMain.moduleName,
                multistateRouteMain.moduleName
            ])
            .run(['$rootScope', '$location', 'ModularModuleModel', 'modularMultistateRoute', function($rootScope, $location, ModularModuleModel, modularMultistateRoute) {
                /*
                 * Listener for url change
                 * mostly to handle if someone modifies url by hand, or first landing (ie. - sent link/bookmark)
                 */
                $rootScope.$on('$locationChangeSuccess', function(event) {

                    //check window so we don't fire this when using goState
                    if (!window.modularMultistateGoState) {

                        var currentUrl = $location.search();
                        var currentModules = ModularModuleModel.getAllModules;

                        //loop through current url, if has nothing we forgo
                        for (var urlObj in currentUrl) {
                            var moduleOb = decodeURIComponent(urlObj);
                            //check if modules contains this module

                            if (currentModules[moduleOb] !== undefined) {

                                var newOb = {};
                                newOb = modularMultistateRoute.parseObjectFromUrl(currentUrl[urlObj]);
                                for (var i in newOb) {
                                    //check rootscope comparrisons before firing callback
                                    if (currentModules[moduleOb].rootScope === $rootScope.$id) {
                                        modularMultistateRoute.loadStates(moduleOb, i, newOb[i]);

                                    }
                                }
                            } else {

                                //is not in modules, this will fire the 5 second check
                                var newObj = {};
                                newObj = modularMultistateRoute.parseObjectFromUrl(currentUrl[urlObj]);
                                for (var p in newObj) {
                                    modularMultistateRoute.loadStates(moduleOb, p, newObj[p]);
                                }
                            }
                        }
                    } else {
                        if (window.modularMultistateRootscope === $rootScope.$id) {
                            window.modularMultistateGoState = false;
                        }
                    }
                });
            }]);

        return metadata;
    }
);

    }
);
