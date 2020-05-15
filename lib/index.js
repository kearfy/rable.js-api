var apis = [];

/**
 * Initial Library.
 *
 * @property {string} version The current version of the Library.
 * @property {string} config The configuration of the Libary.
 */

class RableAPI {
    /**
     * Function that is called upon initialization.
     *
     * @param  {Rable} Instance The Rable instance the plugin needs to bind to.
     * @param  {object} config configuration applied by the user.
     * @param  {string} config.location=/api/ The root url of the API.
     * @param  {null|string|function} config.introduction=DEFAULT Page shown when a request to the root of the api is made. false for nothing, string to a file or a function. set to DEFAULT for the default page.
     * @param  {string} config.defaultMethod=post The default request method applied to an API or an Action. can be overwritten when creating an API or registering an Action.
     */
    constructor(Instance, input) {
        this.instance = Instance;
        this.version = require('./package.json').version;
        this.config = Object.assign(require('./default.json'), (input === undefined ? {} : input));
        this.config.location = (this.config.location.slice(-1) !== '/' ? (this.config.location.slice(-1) == '~' ? this.config.location.slice(1, -1) : this.config.location += '/') : this.config.location);

        this.instance.use(this.config.location + '~', () => {
            var url = req.url.slice(this.config.location.length);
            if (url.slice(-1) == '/') url = url.slice(0, -1);
            var parsed = url.split('/');

            if (parsed.length < 1) {
                return res.json({
                    success: false,
                    error: 'no_api_defined',
                    message: 'No api was defined in the url'
                });
            } else if (parsed.length == 1) {
                var api = url;
                var values = null;
                var Api = this.obtainAPI(api);

                if (Api !== null) {
                    if (Api.defaultAction(req.method) === null || (Api.defaultAction(req.method) === false)) {
                        return res.json({
                            success: false,
                            error: 'no_action_defined',
                            message: 'No Action was defined!'
                        });
                    } else {
                        var action = Api.defaultAction(req.method);
                    }
                } else {
                    return res.json({
                        success: false,
                        error: 'unknown_api',
                        message: 'No API called "' + api + '" is known on this server!'
                    });
                }
            } else {
                var api = parsed[0];
                var action = parsed[1];
                if (parsed.length > 2) {
                    var values = parsed.slice(2);
                } else {
                    var values = null;
                }
            }

            if (Api === undefined) var Api = this.obtainAPI(api);
            if (Api === null) {
                res.json({
                    success: false,
                    error: 'unknown_api',
                    message: 'No API called "' + api + '" is known on this server!'
                });
            } else {
                var Action = Api.obtainAction(action, req.method);
                if (Action === null) {
                    res.json({
                        success: false,
                        error: 'unknown_action',
                        message: 'No Action called "' + action + '" for method "' + req.method + '" is registered on this server!'
                    });
                } else {
                    req.params = {};
                    if (Action.params === null && values !== null) return res.json({
                        success: false,
                        error: 'unneccacary_params',
                        message: 'No parameters are required by this action!'
                    });

                    if (Action.params !== null && Action.params !== false && Action.params !== undefined) {
                        var parsedParamString = Action.params.split('/');
                        if (values === null) {
                            return res.json({
                                success: false,
                                error: 'missing_params',
                                message: 'This action requires params (amnt: ' + parsedParamString.length + ') which were not provided!'
                            });
                        } else {
                            if (values.length > parsedParamString.length) return res.json({
                                success: false,
                                error: 'too_many_params',
                                message: 'Too many params (expected ' + parsedParamString.length + ', but ' + values.length + ' given) were provided to the server! Please refer to the docs (if any).'
                            });

                            if (values.length < parsedParamString.length) return res.json({
                                success: false,
                                error: 'too_few_params',
                                message: 'Too few params (expected ' + parsedParamString.length + ', but ' + values.length + ' given) were provided to the server! Please refer to the docs (if any).'
                            });

                            if (values.length == parsedParamString.length) {
                                parsedParamString.forEach((p, i) => req.params[(p.slice(0, 1) === ':' ? p.slice(1) : 'p')] = values[i]);
                            }
                        }
                    }

                    Action.action(req, res);
                }
            }
        }, {noTemplate: true});

        if (this.config.introduction !== false && this.config.introduction !== null) {
            this.instance.use(this.config.location.slice(0, -1), () => {
                if (this.config.introduction === 'DEFAULT' || this.config.introduction.constructor.name != 'String' || this.config.introduction.constructor.name != 'Function') {
                    res.sendFile(__dirname + '/intro.rbl', {data: {
                        version: this.version
                    }})
                } else if (this.config.introduction.constructor.name == 'String') {
                    res.sendFile(this.config.introduction.target, {data: {
                        version: this.version
                    }});
                } else {
                    this.config.introduction(req, res, next);
                }
            });
        }
    }

    /**
     * create an API (/apiRootURL/API)
     *
     * @param  {string} name Name of the API.
     * @param  {object} config Configuration applied to API.
     * @param  {object} config.defaultAction={}
     * @param  {string} config.defaultAction.method Default Action for a specified method.
     * @param  {string} config.defaultMethod=Applied_by_Master Default method applied when registering a new Action.
     * @returns {RableAPIModel} Returns a RableAPIModel (The API).
     */
    createAPI(name, input = {}) {
        if (this.exists(name)) {
            throw new Error('Error while creating API: API already exists!').code = 'api_exists';
        } else {
            var api = new RableAPIModel(this, name, input);
            apis.push(api);
            return api;
        }
    }

    /**
     * obtain an API by name
     *
     * @param  {string} name Name of the targeted API.
     * @returns {null|RableAPIModel} null if no API matched, else a RableAPIModel.
     */
    obtainAPI(name) {
        var matchedAPI = null;
        apis.forEach(a => { if (a.name === name) matchedAPI = a; });
        return matchedAPI;
    }

    /**
     * Check if an API exists by name.
     *
     * @param  {string} name Name of the targeted API.
     * @returns {boolean} Returns a Boolean stating true (exists) or false (does not exist).
     */
    exists(name) {
        var matchedAPI = null;
        apis.forEach(a => { if (a.name === name) matchedAPI = a; });
        return matchedAPI !== null;
    }

    /**
     * remove an API by name. Throws an error if no API matched.
     *
     * @param  {string} name Name of the targeted API.
     */
    removeAPI(name) {
        var match = false;
        apis.forEach((a, index) => {
            if (a.name === name) {
                match = true;
                apis.splice(index, 1);
            }
        });

        if (!match) {
            throw new Error('Error while removing API: API does not exist!').code = 'unknown_api';
        }
    }

    /**
     * Obtain a list of APIs.
     *
     * @returns {array} returns a list of API names formatted into an array.
     */
    listAPIs() {
        var list = [];
        apis.forEach(a => list.push(a.name));
        return list;
    }

    /**
     * Update or retrieve the default method applied to newly created APIs (unless overwritten). Throws an error if an invalid value was provided.
     *
     * @param  {string} method The targeted method. (leave empty for retrieval)
     * @returns {string|null|undefined} For retrieval, returns the default method stored in a string.
     */
    defaultMethod(method) {
        if (method === undefined) {
            return this.config.defaultMethod;
        } else if (method === null || method === false) {
            throw new Error('Error while updating the default Method: An invalid value was provided!').code = 'invalid_method';
        } else {
            this.config.defaultMethod = method;
        }
    }
}

/**
  * The API Model of the Library.
  *
  * @property  {string} name The name of the API Model.
  * @property  {object} config Configuration applied to API Model.
  */
class RableAPIModel {
    #actions;
    #master;

    /**
     * Function that is called upon initialization.
     *
     * @param  {RableAPI} master The RableAPI controller.
     * @param  {string} name Name of the API.
     * @param  {object} config Configuration applied to API.
     * @param  {object} config.defaultAction={}
     * @param  {string} config.defaultAction.method Default Action for a specified method.
     * @param  {string} config.defaultMethod=Applied_by_Master Default method applied when registering a new Action.
     * @returns {type}            description
     */
    constructor(master, name, input = {}) {
        this.#actions = [];
        this.#master = master;
        this.name = name;
        this.config = Object.assign({
            defaultAction: {},
            defaultMethod: this.#master.config.defaultMethod
        }, input);
    }

    /**
     * Register a new action. Throws an error if API was deleted previously or if the Action already Exists.
     *
     * @param  {string} name The name of the Action (/apiRootURL/API/Action)
     * @param  {function} action The action of the Action [:D]. (req, res) will be passed.
     * @param  {object|string} config Configuration of the Action. Can also be set to a string containing the method of the Action.
     * @param  {string} config.method=Applied_by_Master Method of the Action.
     * @param  {string} config.params=false Additional params passed in req.params. example: "param1/param2" for url "/apiRootURL/API/Action/value1/value2". placing : in front of a param name is not required but allowed, example: ":param1/:param2".
     * @returns  {boolean|undefined} Returns true if successful.
     */
    registerAction(name, action, input = {}) {
        if (this.#master.exists(this.name)) {
            if (this.actionExists(name)) {
                throw new Error('Error while registering Action: Action already exists!').code = 'action_exists';
            } else {
                if (input.constructor.name == 'String') {
                    var tmp = Object.assign({
                        params: false
                    }, {method:input});
                } else {
                    var tmp = Object.assign({
                        params: false
                    }, input);
                }

                tmp.name = name;
                tmp.action = action;

                if (tmp.params !== false) {
                    if (tmp.params[0] == '/') tmp.params = tmp.params.slice(1);
                    if (tmp.params.slice(-1) == '/') tmp.params = tmp.params.slice(0, -1);
                }

                if (tmp.method === undefined) tmp.method = this.defaultMethod();

                this.#actions.push(tmp);
                return true;
            }
        } else {
            throw new Error('Error while registering Action: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Obtain info of an Action by name. Throws an error if API was deleted previously.
     *
     * @param  {string} name The name of the Action.
     * @param  {string} method=Applied_by_Master The method of the Action.
     * @returns {object|null|undefined} Returns an Object holding the appropiate data about the requested Action if successful. null if no such Action was found.
     */
    obtainAction(name, method) {
        if (method === undefined) var method = this.defaultMethod();
        if (this.#master.exists(this.name)) {
            var matchedAction = null;
            this.#actions.forEach(a => { if (a.name === name && a.method.toLowerCase() == method.toLowerCase()) matchedAction = a; });
            return matchedAction;
        } else {
            throw new Error('Error while checking if action exists: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Check if an Action exists by name. Throws an error if API was deleted previously.
     *
     * @param  {string} name The name of the Action.
     * @param  {string} method=Applied_by_Master The method of the Action.
     * @returns {boolean|undefined} Returns a Boolean stating true (exists) or false (does not exist).
     */
    actionExists(name, method) {
        if (method === undefined) var method = this.defaultMethod();
        if (this.#master.exists(this.name)) {
            var matchedAction = null;
            this.#actions.forEach(a => { if (a.name === name && a.method.toLowerCase() == method.toLowerCase()) matchedAction = a; });
            return matchedAction !== null;
        } else {
            throw new Error('Error while checking if action exists: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Remove an Action by name. Throws an error if API was deleted previously or if no such Action was found.
     *
     * @param  {string} name The name of the Action.
     * @param  {string} method=Applied_by_Master The method of the Action.
     */
    removeAction(name, method) {
        if (method === undefined) var method = this.defaultMethod();
        if (this.#master.exists(this.name)) {
            var match = false;
            this.#actions.forEach((a, index) => {
                if (a.name === name && a.method.toLowerCase() == method.toLowerCase()) {
                    match = true;
                    this.#actions.splice(index, 1);
                }
            });

            if (!match) {
                throw new Error('Error while removing Action: Action does not exist!').code = 'unknown_action';
            }
        } else {
            throw new Error('Error while removing Action: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Check if an Action exists by name. Throws an error if API was deleted previously.
     *
     * @returns {array|undefined} Returns an array holding a list of Objects storing 'name' and 'method'.
     */
    listActions() {
        if (this.#master.exists(this.name)) {
            var list = [];
            this.#actions.forEach(a => list.push({name: a.name, method: a.method}));
            return list;
        } else {
            throw new Error('Error while listing Actions: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Update or retrieve the default Action for a method. Throws an error if API was deleted previously.
     *
     * @param  {string} method The targeted method.
     * @param  {string} action The targeted Action. (leave empty for retrieval)
     * @returns {string|null|undefined} For retrieval, returns name of an action stored in a string or null if no action was yet defined for the given method.
     */
    defaultAction(method, action) {
        if (this.#master.exists(this.name)) {
            if (action === undefined) {
                return (this.config.defaultAction[method] === undefined ? null : this.config.defaultAction[method]);
            } else {
                this.config.defaultAction[method] = action;
            }
        } else {
            throw new Error('Error while updating the default Action: API was removed!').code = 'api_removed';
        }
    }

    /**
     * Update or retrieve the default method applied to new registered Actions (unless overwritten). Throws an error if API was deleted previously or if an invalid value was provided.
     *
     * @param  {string} method The targeted method. (leave empty for retrieval)
     * @returns {string|null|undefined} For retrieval, returns the default method stored in a string.
     */
    defaultMethod(method) {
        if (this.#master.exists(this.name)) {
            if (method === undefined) {
                return this.config.defaultMethod;
            } else if (method === null || method === false) {
                throw new Error('Error while updating the default Method: An invalid value was provided!').code = 'invalid_method';
            } else {
                this.config.defaultMethod = method;
            }
        } else {
            throw new Error('Error while updating the default Method: API was removed!').code = 'api_removed';
        }
    }
}

module.exports = RableAPI;
