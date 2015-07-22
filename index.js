var fs = require('fs');

/* Used to store the path until the JSON element concerned. This way the JSON source will be modifiable when we
 take an element from the queue. "result" is the JSON being constructed, the JSON to be returned with circular references
 transformed */
function ModifierJSON(result, path) {

    //Used to construct new paths from the current element (if it's a composed JSON or array)
    this.getter = function () {
        return path;
    };

    //Function to replace a JSON of path by "replacer"
    this.modify = function (replacer) {

        //The first call to this function (from the JSON root) shouldn't modify our result
        if (path === '') {
            return;
        }

        //We construct the steps necessary to get to the concerned JSON from the root
        var arrayOfSteps = path
            .slice(1, path.length - 1)
            .split('][');

        //Recursive function that finds and replaces the JSON of path
        (function auxFindElementToReplace(pointerResult, array, replacer) {

            //We parse the next step, so we can use pointerResult[nextStep]
            var nextStep = JSON.parse(array[0]);

            //When we arrive to the JSON of path
            if (array.length === 1) {
                //pointerResult[nextStep] is array not yet instantiated
                if (pointerResult[nextStep] === undefined && replacer==='[object Array]') {
                    pointerResult[nextStep] = [];
                }
                //pointerResult[nextStep] is composed JSON not yet instantiated
                else if (pointerResult[nextStep] === undefined && replacer==='[nested JSON]') {
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
}

//Test if value has an elementary type
var testElementary  = function (value) {
    return ((value === null) || (value === undefined) ||
    (typeof value === 'boolean') ||
    (typeof value === 'string') ||
    (typeof value === 'number'));
};

//Main function to travel through the JSON and transform the circular references and personalized replacements
JSON.breakCyclesInBFS = function (object, toChange, toBeChangedFor) {

    var foundStack = [], //Stack to keep track of discovered objects
        foundPathStack = [], //Stack of paths of discovered values
        queueOfModifiers = [], //Necessary to change our JSON as we take elements from the queue (BFS algorithm)
        queue = [], //queue of JSON elements, following the BFS algorithm
        paths = []; //necessary to write the circular references by paths

    //We instantiate our result root.
    var result;
    if (object instanceof Array)
        result = [];
    else
        result = {};

    //To write the functions in our way
    var functionRegex = /\([^{]*/;

    //We first put all the JSON source in our queues
    queue.push(object);
    queueOfModifiers.push(new ModifierJSON (object, ''));
    paths.push('');

    //BFS algorithm
    while (queue.length > 0) {

        //JSON to be modified and its modifier
        var value = queue.shift();
        var modifier = queueOfModifiers.shift();
        //The path that leads to this JSON, so we can build other paths from it
        var path = modifier.getter();

        //We first verify if this JSON is to be replaced by a personalized replacement
        var positionToChange = toChange.indexOf(value);
        if (positionToChange !== -1) {
            modifier.modify(toBeChangedFor[positionToChange]);
            continue;
        }

        //If it's an elementary value, it can't be circular, so we just put this value in our JSON result.
        if (testElementary(value)) {
            modifier.modify(value);
        }
        else if (typeof value === 'object') {

            //If the value has already been discovered, we fix its circular reference and go to the next iteration
            var positionStack = foundStack.indexOf(value);
            if (positionStack !== -1) {
                modifier.modify('$ref: [root]' + foundPathStack[positionStack]);
                continue;
            }

            //At the first time we discover a certain value, we put it in the stack
            foundStack.push(value);
            foundPathStack.push(path);

            //If the current value is an array, we put '[]' in the result JSON, and all the children in the queues
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                modifier.modify('[object Array]');
                for (var i = 0; i < value.length; i++) {
                    queue.push(value[i]);
                    queueOfModifiers.push(new ModifierJSON(result, path + '[' + i + ']'));
                    paths.push(path + '[' + i + ']');
                }
            }
            //If value is a nested JSON, we put '{}' in the result JSON, and all children in the queues
            else {
                modifier.modify('[nested JSON]');
                for (var name in value) {
                    if (Object.prototype.hasOwnProperty.call(value, name)) {
                        queue.push(value[name]);
                        queueOfModifiers.push(new ModifierJSON(result, path + '[' + JSON.stringify(name) + ']'));
                        paths.push(path + '[' + JSON.stringify(name) + ']');
                    }
                }
            }
        }
        //If it's a function, we only write 'f(arg1, arg2, ...) { number of lines }'
        else if (typeof value === 'function') {
            var fs = value.toString();
            var lineNum = fs.split(/\r\n|\r|\n/).length;
            modifier.modify("f " + functionRegex.exec(value.toString())[0] + "{ " + lineNum + " }");
        }
    }

    return result;
};

module.exports = function (json, file, toChange, toBeChangedFor) {

    //Define here the personalized replacements
    toChange = toChange || [];
    toBeChangedFor = toBeChangedFor || [];

    //We replace the JSON passed by the brand new JSON returned from JSON.breakCyclesInBFS
    //This way, the original JSON in unchanged, and it can be used for other operations
    json = JSON.breakCyclesInBFS(json, toChange, toBeChangedFor);

    //We write the JSON in the file whose path is passed as argument
    var s = JSON.stringify(json, null, 2);
    if (file) {
        fs.writeFileSync(file, s);
    }

    //We also make the result JSON available for other uses
    return s;
};