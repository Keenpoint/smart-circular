var _ = require("lodash");

/* Used to store the path until the JSON element concerned. This way the JSON source will be modifiable when we
 take an element from the queue. "result" is the JSON being constructed, the JSON to be returned with circular references
 transformed */
var ObjectEditor = function(result, path) {//todo: why makePathName not in here?
    this.result = result;
    this.path = path;
};

//Function to replace a JSON of path by "replacer"
ObjectEditor.prototype.editObject = function(replacer) {

    //The first call to this function (from the JSON root) shouldn't modify our result
    if(this.path === "") return;

    //We construct the steps necessary to get to the concerned JSON from the root
    var arrayOfSteps = this.path
        .slice(1, this.path.length - 1)
        .split("][");

    //Recursive function that finds and replaces the JSON of path
    (function auxFindElementToReplace(pointerResult, array, replacer) {

        //We parse the next step, so we can use pointerResult[nextStep]
        var nextStep = array[0];

        //When we arrive to the JSON of path
        if(array.length === 1) {
            //pointerResult[nextStep] is array not yet instantiated
            if(pointerResult[nextStep] === undefined && replacer === "partialArray") {
                pointerResult[nextStep] = [];
            }
            //pointerResult[nextStep] is composed JSON not yet instantiated
            else if(pointerResult[nextStep] === undefined && replacer === "nestedJSON") {
                pointerResult[nextStep] = {};
            }
            //pointerResult[nextStep] is elementary (string, number, etc.)
            else {
                pointerResult[nextStep] = replacer;
            }

            //We stop going into our JSON
            return;
        }

        //We go to the next step, deleting it from our array, calling auxFindElementToReplace again
        pointerResult = pointerResult[nextStep];
        arrayOfSteps.shift();
        auxFindElementToReplace(pointerResult, arrayOfSteps, replacer);
    })(this.result, arrayOfSteps, replacer);
};

var FoundObject = function(value, path) {
    this.value = value;
    this.path = path;
};

//To construct path leading to sub-JSON in a friendly-user way
FoundObject.prototype.makePathName = function() {
    var steps = this.path
        .slice(1, this.path.length - 1)
        .split("][");

    var str = "$";

    for(var index in steps) {
        if(_.has(steps, index)) {
            str += isNaN(steps[index]) ? "." + steps[index] : "[" + steps[index] + "]";
        }
    }

    return str;
};

//Main function to travel through the JSON and transform the circular references and personalized replacements
var breakCyclesInBFS = function(object, customizer) {

    var foundStack = [], //Stack to keep track of discovered objects
        queueOfModifiers = [], //Necessary to change our JSON as we take elements from the queue (BFS algorithm)
        queue = []; //queue of JSON elements, following the BFS algorithm

    //We instantiate our result root.
    var result = _.isArray(object) ? [] : {};

    //To write the functions in our way
    var functionRegex = /\([^{]*/;

    //We first put all the JSON source in our queues
    queue.push(object);
    queueOfModifiers.push(new ObjectEditor(object, ""));

    var positionStack;

    //BFS algorithm
    while(queue.length > 0) {

        //JSON to be modified and its editor
        var value = queue.shift();
        var editor = queueOfModifiers.shift();
        //The path that leads to this JSON, so we can build other paths from it
        var path = editor.path;

        //We first make any personalized replacements
        //If customizer doesn't affect the value, customizer(value) returns undefined and we jump this if
        if(customizer !== undefined) {

            //By using this variable, customizer(value) is called only once.
            var customizedValue = customizer(value);

            if(customizedValue !== undefined) {

                var newValue = customizedValue;

                //If the value has already been discovered, we fix its circular reference
                positionStack = _.chain(foundStack)
                    .pluck("value")
                    .indexOf(value)
                    .value();
                if(positionStack !== -1) {//todo: if(...) newValue = ...; editor.editObject(newValue);
                    editor.editObject(foundStack[positionStack].makePathName());
                }
                else {
                    editor.editObject(newValue);
                }

                //The personalized replacements overwrite any other changes
                continue;//todo: why customizer is separated?
            }
        }


        if(typeof value === "object") {

            //If the value has already been discovered, we fix its circular reference and go to the next iteration
            positionStack = _.chain(foundStack)
                .pluck("value")
                .indexOf(value)
                .value();
            
            if(positionStack !== -1) {
                editor.editObject(foundStack[positionStack].makePathName());
                continue;
            }

            //At the first time we discover a certain value, we put it in the stack
            foundStack.push(new FoundObject(value, path));

            //If the current value is an array, we put "[]" in the result JSON, and all the children in the queues
            //If value is a nested JSON, we put "{}" in the result JSON, and all children in the queues
            var type = _.isArray(value) ? "partialArray" : "nestedJSON"; // TODO change these definitions
            editor.editObject(type);

            for(var component in value) {
                if(_.has(value, component)) {
                    queue.push(value[component]);
                    var newPath = path + "[" + component + "]";
                    queueOfModifiers.push(new ObjectEditor(result, newPath));
                }
            }
        }
        //If it's a function, we only write "f(arg1, arg2, ...) { number of lines }"
        else if(typeof value === "function") {//todo: why not remove it and let the user put it in customizer?
            var fs = value.toString();
            var lineNum = fs.split(/\r\n|\r|\n/).length;
            editor.editObject("f " + functionRegex.exec(value.toString())[0] + "{ " + lineNum + " }");
        }
        //If it's an elementary value, it can't be circular, so we just put this value in our JSON result.
        else {
            editor.editObject(value);
        }
    }

    return result;
};

module.exports = function(json, customizer) {
    //We replace the JSON passed by the brand new JSON returned from JSON.breakCyclesInBFS
    //This way, the original JSON in unchanged, and it can be used for other operations
    return breakCyclesInBFS(json, customizer);
};