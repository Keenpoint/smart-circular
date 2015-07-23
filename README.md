# json-references

Library to simplify JSON, replacing **circular** and **repeated** structures by the *path* leading to the first time this structure happens. Uses *breadth-first search* to do replacements with the shortest paths.


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

- Avoiding circular references

```javascript
var json = {
       a: {
            b: 'please, not circular'
       }
};

json.a.b = json.a;

var result = jr(json);      
```

This script gives:

```javascript
{
      "a": {
          "b": "REFERENCE = JSON.\"a\""
       }
}  
```


- Avoiding repetitions.

```javascript
var json = {
            a: {
                     b: {
                            c: 55
                     }
            },
            d: {
                     e: 4
            }
};

json.d = json.a.b;

 var result = jr(json);
```

This script gives:

```javascript
{
         "a": {
              "b": "REFERENCE = JSON.\"d\""
         },
         "d": {
              "c": 55
         }
}
```

Realize the reference is put at *b*, even though *d* has changed. If we had conserved *b* to put the path at *d*, this path would be longer. This is annoying when dealing with really big JSON's.

- The following script will not only replace circular and repeated references, but also replace by *false* all boolean values that are *true*.

```javascript
 var result = jr(json, function (value) {
            if (value === true) {
                //return replacement
                return false; 
            }
        });
```

- If you want to replace an entire JSON object, use the method ['isEqual' from lodash](https://lodash.com/docs#isEqual):

```javascript
 var result = jr(json, function (value) {
             //other is the deep JSON object you want to replace
             if (_.isEqual(value, other)) {
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

The replacements made by the algorithm (not personalized) are strings in the form 'REFERENCE = JSON.[path]'.

The paths written in the result are easy to read: 'JSON' is your original variable 'value'. 

So the path below points to 'your variable' (which is an array) → 'second position of the array' (arrays begin at 0) → 'key friends' → 'third friend' → 'his name'.

```javascript
  REFERENCE = JSON.1.\"friends\".2.\"name\"
```


