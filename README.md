**By Google Translate from Japanese to English.**

# Overview
I made it for the purpose of replacing the debugger of Scite4AutoHotkey.
So you can use all the features it can.
In addition to that, I am implementing new features such as conditional breakpoints.
All features can be found in [`Features`](#features).

# Installation
Press `F1`, type `ext vscode-ahk-debug`

# Features
## Data inspection
See [this](https://code.visualstudio.com/docs/editor/debugging#_data-inspection)

## Breakpoints
See [this](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)

## Advanced breakpoints (Optional)
### Note
> **This feature is experimental and subject to change.**
Also, the evaluation of the condition is so slow that you'll feel frozen for loops over 100.
This is because the AutoHotkey Debugger doesn't support this feature and it is inefficient. Therefore, there is no big improvement.
However, in many cases this feature will work. Unless conditions or logs are set for breakpoints, the speed will not slow down much, so if you do not bother with the specification change, you should always enable this function.

### How to enable
`useAdvancedBreakpoint` to `true` in launch.json.
```json
{
    ...
    "useAdvancedBreakpoint": true
}
```

### Conditional breakpoint
See [this](https://code.visualstudio.com/docs/editor/debugging#_conditional-breakpoints)

#### Condition expresion
##### Condition grammer
`Value [Operator Value]`

##### Rules
* `Value`: `PropertyName` or `Primitive`
* `PropertyName` Property name displayed in data inspection (only properties with primitive values are supported). e.g.`prop`, `prop.field`, `prop[0]`, `prop["spaced key"]`
* `Primitive` AutoHotkey primitives. e.g.`"string"`, `123`, `123.456`, `0x123`
* `Operator` AutoHotkey like comparison operators
    * `=` Equal ignore case
    * `==` Equal case sensitive
    * `!=` Not equal ignore case
    * `!==` Not equal case sensitive
    * `~=` Compare with regular expression (AutoHotkey like). e.g.`123 ~= "O)\d+"`
        * Note. AutoHotkey regular expression is converted to JavaScript regular expression. for that reason I cannot use some functions such as `(?R)`. But in most cases you won't mind.
    * `>` Greater than
    * `>=` Greater than or equal
    * `<` Less than
    * `<=` Less than or equal

### Hit count breakpoint
##### Condition grammer
`[{Counter} Operator] Number`

##### Rules
* `Counter` Number of times the breakpoint has been reached (no need to enter)
* `Operator` If omitted, it is equivalent to `>=`
    * `= or ==` Same as `Counter == Number`
    * `>` Same as `Counter > Number`
    * `>=` Same as `Counter >= Number`
    * `<` Same as `Counter < Number`
    * `<=` Same as `Counter <= Number`
    * `%` Equivalent to `Mod(Counter, Number) == 0`
* `Number` Input value

### Log point
Print a message to standard output. If you set a message, it will not stop at the breakpoint.
If the condition is set, the message is output only when the condition is passed.

Also, enclosing the full name of the property as it appears in the data inspection in braces, it will be replaced with the value of the property. (Only properties with primitive values are supported)

If you want to show the curly braces, you can escape it by prefixing it with `\` like `\ {` or `\}`.

## Loaded scripts
See [this](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_access-loaded-scripts)

# Known issues
AutoHotkey v1
AutoHotkey v2
* Inspecting a property shows `"<error>"`.

# Issues
See [issues](https://github.com/zero-plusplus/vscode-ahk-debug/issues)

# Roadmap
- [x] Data inspection
    - [x] Primitive
    - [x] Object
- [ ] Call stack
    - [x] Call stack list
    - [ ] Toggle skipping this file
    - [ ] Restart frame
- [x] Show loaded scripts
- [ ] Breakpoints
    - [x] Basic breakpoints
    - [ ] Column breakpoints
    - [ ] Function breakpoints
    - [x] Conditional breakpoints
    - [x] Hit Conditional breakpoints
    - [x] Log point
- [x] Step-in, step-over, step-out
- [ ] Watch expression
    - [ ] Variable name
    - [ ] Expression
- [ ] Show value when hovering
    - [x] Variable name
    - [ ] Expression