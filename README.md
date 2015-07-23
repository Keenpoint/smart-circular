# json-references

Library to simplify JSON, replacing **circular** and **repeated** structures by the *path* leading to the first time this structure happens (in *breadth-first search*, to use the shortest paths).


# Installation

$ npm i json-references


# Usage 

- Require the module

```javascript
var jr = require('json-references');
```

- Pass the JSON to be simplified as the first argument of the jr function.
- Optionally, pass a second argument with your personalized function to transform parts of the JSON (cf. examples).

```javascript
var result = jr(value, [customizer]);
```


# Examples

- Classic way. Using the *breadth-first search*, the replacements of circular and repeated references will be the shortest paths you can get.

```javascript
 var result = jr(json);
```

The following script will not only replace circular and repeated references, but also replace by *false* all boolean values that are *true*.

```javascript
 var result = jr(json, function (value) {
            if (value === true) {
                return false; //return replacement
            }
        });
```

If you want to replace an entire JSON object, use the method [isEqual from lodash](https://lodash.com/docs#cloneDeep):

```javascript
 var result = jr(json, function (value) {
             if (_.isEqual(value, other)) { //other is the deep JSON object you want to replace
                //returning replacement
                return [
                    {
                        "id": 0,
                        "name": "Danilo Augusto"
                    },
                    {
                        "id": 1,
                        "name": "Sherlock Holmes"
                    }
                ];
            }
        });
        
```


# Understanding the paths

The replacements made by the algorithm (not personalized) are strings like 'REFERENCE = JSON.[path]'.

The paths written in the result are easy to read: in the following example, 'JSON' is your original variable 'value', which is an array. 

So this path points to 'your variable' → 'second position of the array' (arrays begin at 0) → 'key friends' → 'third friend' → 'his name'.

```javascript
  REFERENCE = JSON.1.\"friends\".2.\"name\"
```



