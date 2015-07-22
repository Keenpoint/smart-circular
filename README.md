# json-references

Library to simplify JSON, replacing circular and repeated structures by the path leading to the first time this structure happens (in breadth-first search). Used to debug JSON objects.


# Installation

$ npm i json-references


# Usage 

Require the module

```javascript
var jr = require('json-references');
```

Write the result of original_JSON simplification in the file indicated as second argument

```javascript
jr(original_JSON, file_path, [array_of_elements_to_replace], [array_of_replacements]);
```


If you want the result stringified in a variable:

```javascript
var result = jr(original_JSON, file_path, [array_of_elements_to_replace], [array_of_replacements]);
```



If you want to replace every object 'x' of the JSON by a certain object 'y', and every object 'a' by 'b', pass array_of_elements_to_replace as [x, a] and array_of_replacements as [y, b]. These are optional arguments, and they must have same length. Default: no replacements, except for repetitive objects or circular references. 



