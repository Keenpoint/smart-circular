# json-references

Library to simplify JSON, replacing circular and repeated structures by the path leading to the first time this structure happens (in breadth-first search). Used to debug JSON objects and fix circular references, mainly.


# Installation

$ npm i json-references


# Usage 

Require the module

```javascript
var jr = require('json-references');
```

Pass the JSON to be simplified as the first argument of the jr function.
Optionally, pass a second argument with your personalized function to transform parts of the JSON (cf. examples).

```javascript
jr(value, [customizer]);
```


# Examples

Classic way. 

```javascript
 var result = jr(json);
```

The following script will now only replace circular and repeated references, but also replace by false all boolean values that are true.

```javascript
 var result = jr(json, function (value) {
            if (value === true) {
                return false;
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



