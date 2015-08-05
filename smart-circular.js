/* Used to store the path until the JSON element concerned. This way the JSON source will be modifiable when we
 take an element from the queue. "result" is the JSON being constructed, the JSON to be returned with circular references
 transformed */
var ObjectEditor = function(result, path) {//todo: why makePathName not in here?

    //Used to construct new paths from the current element (if it's a composed JSON or array)
    this.getter = function() {//todo: why not on prototype?
        return path;
    };

    //Function to replace a JSON of path by "replacer"
    this.editObject = function(replacer) {

        //The first call to this function (from the JSON root) shouldn't modify our result
        if(path === '') return;

        //We construct the steps necessary to get to the concerned JSON from the root
        var arrayOfSteps = path
            .slice(1, path.length - 1)
            .split('][');

        //Recursive function that finds and replaces the JSON of path
        (function auxFindElementToReplace(pointerResult, array, replacer) {

            //We parse the next step, so we can use pointerResult[nextStep]
            var nextStep = JSON.parse(array[0]);

            //When we arrive to the JSON of path
            if(array.length === 1) {
                //pointerResult[nextStep] is array not yet instantiated
                if(pointerResult[nextStep] === undefined && replacer === '[object Array]') {
                    pointerResult[nextStep] = [];
                }
                //pointerResult[nextStep] is composed JSON not yet instantiated
                else if(pointerResult[nextStep] === undefined && replacer === '[nested JSON]') {
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
        })(result, arrayOfSteps, replacer);
    }
};

//Test if value has an elementary type
var testElementary = function(value) {
    return ((value === null) || (value === undefined) ||
    (typeof value === 'boolean') ||
    (typeof value === 'string') ||
    (typeof value === 'number'));
};

//To construct path leading to sub-JSON in a friendly-user way
var makePathName = function(path) {
    var steps = path
        .slice(1, path.length - 1)
        .split('][');

    var str = '';

    for(var index in steps) {
        if(steps.hasOwnProperty(index)) {
            str += isNaN(steps[index]) ? '.' + JSON.parse(steps[index]) : '[' + steps[index] + ']';
        }
    }

    return str;
};

//Main function to travel through the JSON and transform the circular references and personalized replacements
JSON.breakCyclesInBFS = function(object, customizer) {//todo: put it out of JSON?

    var foundStack = [], //Stack to keep track of discovered objects
        foundPathStack = [], //Stack of paths of discovered values
        queueOfModifiers = [], //Necessary to change our JSON as we take elements from the queue (BFS algorithm)
        queue = [], //queue of JSON elements, following the BFS algorithm
        paths = []; //necessary to write the circular references by paths

    //We instantiate our result root.
    var result = object instanceof Array ? [] : {};

    //To write the functions in our way
    var functionRegex = /\([^{]*/;

    //We first put all the JSON source in our queues
    queue.push(object);
    queueOfModifiers.push(new ObjectEditor(object, ''));
    paths.push('');

    var positionStack;

    //BFS algorithm
    while(queue.length > 0) {

        //JSON to be modified and its modifier
        var value = queue.shift();
        var modifier = queueOfModifiers.shift();
        //The path that leads to this JSON, so we can build other paths from it
        var path = modifier.getter();

        //We first make any personalized replacements
        //If customizer doesn't affect the value, customizer(value) returns undefined and we jump this if
        if(customizer !== undefined && customizer(value) !== undefined) {//todo: call customizer only once

            var newValue = customizer(value);//todo: why snake case?

            //If the value has already been discovered, we fix its circular reference
            positionStack = foundStack.indexOf(newValue);
            if(positionStack !== -1) {//todo: if(...) newValue = ...; modifier.editObject(newValue);
                modifier.editObject('$' + makePathName(foundPathStack[positionStack]));
            }
            else {
                modifier.editObject(newValue);
            }

            //The personalized replacements overwrite any other changes
            continue;//todo: why customizer is separated?
        }

        //If it's an elementary value, it can't be circular, so we just put this value in our JSON result.
        if(testElementary(value)) {//todo: utility?
            modifier.editObject(value);//todo: this is not a modifier any more, this is an object editor
        }
        else if(typeof value === 'object') {

            //If the value has already been discovered, we fix its circular reference and go to the next iteration
            positionStack = foundStack.indexOf(value);
            if(positionStack !== -1) {
                modifier.editObject('$' + makePathName(foundPathStack[positionStack]));//todo: add "$" in makePathName
                continue;
            }

            //At the first time we discover a certain value, we put it in the stack
            foundStack.push(value);
            foundPathStack.push(path);

            //If the current value is an array, we put '[]' in the result JSON, and all the children in the queues
            if(Object.prototype.toString.apply(value) === '[object Array]') {//todo: so simple in lodash...
                modifier.editObject('[object Array]');//todo: ?
                for(var i = 0; i < value.length; i++) {
                    queue.push(value[i]);
                    queueOfModifiers.push(new ObjectEditor(result, path + '[' + i + ']'));//todo: var newPath = path + '[' + i + ']'
                    paths.push(path + '[' + i + ']');
                }
            }
            //If value is a nested JSON, we put '{}' in the result JSON, and all children in the queues
            else {
                modifier.editObject('[nested JSON]');//todo: what's that?
                for(var name in value) {
                    if(Object.prototype.hasOwnProperty.call(value, name)) {
                        queue.push(value[name]);
                        queueOfModifiers.push(new ObjectEditor(result, path + '[' + JSON.stringify(name) + ']'));//todo: why JSON.stringify? + todo newPath
                        paths.push(path + '[' + JSON.stringify(name) + ']');
                    }
                }
            }
        }
        //If it's a function, we only write 'f(arg1, arg2, ...) { number of lines }'
        else if(typeof value === 'function') {//todo: why not remove it and let the user put it in customizer?
            var fs = value.toString();
            var lineNum = fs.split(/\r\n|\r|\n/).length;
            modifier.editObject("f " + functionRegex.exec(value.toString())[0] + "{ " + lineNum + " }");
        }//todo: else?
    }

    return result;
};

module.exports = function(json, customizer) {
    //We replace the JSON passed by the brand new JSON returned from JSON.breakCyclesInBFS
    //This way, the original JSON in unchanged, and it can be used for other operations
    return JSON.breakCyclesInBFS(json, customizer);
};