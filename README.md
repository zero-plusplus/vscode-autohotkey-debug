# Before reading
Please note the following first.
* This document has been **translated from Japanese to English** by Google Translate.
* **This extension alone will not work**. You will need to separately install an extension that supports AutoHotkey language(Most famous is `slevesque.vscode-autohotkey`). If you are using AutoHotkey v2 you should look for an extension that supports ah2 and ahk2(For example `dudelmoser.vscode-autohotkey2`). I plan to make an all-in pack, but it will take time because I will make it from scratch for studying.
* It is expected that there are still many potential bugs. Please report to [issues](https:github.com/zero-plusplus/vscode-autohotkey-debug/issues).
* If you want to update, please see News first. It may contain important information.
* The new version may have defects. In that case, please refer to the [CHANGELOG](CHANGELOG.md) and reinstall the previous version.

# News
### Update
* 1.2.0 - 2020-05-30
    * Added: The setting item of `env` to launch.json
    * Changed: Warn if the value assigned to `args` in launch.json is a non-string
* 1.1.0 - 2020-05-27
    * Added: The setting item of `args` to launch.json
* 1.0.5 - 2020-05-27 - Fixed a fatal bug
    * Fixed: Debug will fail if launch.json is not created or "program" is omitted. This bug occurred in 1.0.4

See [CHANGELOG](CHANGELOG.md) for details.

# Overview
I made it for the purpose of replacing the debugger of Scite4AutoHotkey.
So you can use all the features it can.
In addition to that, I am implementing new features such as conditional breakpoints.
All features can be found in [`Features`](#features).

The following features are not supported due to restrictions
* Attach to a script that is already running

# Installation
1. Install [AutoHotkey](https://www.autohotkey.com/)
2. Install an extension that supports AutoHotkey (Most famous is `slevesque.vscode-autohotkey`)
3. Press `Ctrl + P`, type `ext install zero-plusplus.vscode-autohotkey-debug`

# Usage
1. Open a file with the (`ahk` or `ahk2` or `ah2`) extension.
2. Set breakpoints wherever you like.
3. Press `F5`

# Customize the launch configuration
If you want to change the launch configuration of the debugger, you need to edit `launch.json`. If you are satisfied with the default settings, you do not need to look at this item.

You can learn the basics of `launch.json` [here](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations)

Below is the default configuration snippet.
```json
.vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "AutoHotkey Debug",
            "request": "launch",
            "type": "ahk",
            "runtime_v1": "AutoHotkey.exe",
            "runtime_v2": "v2/AutoHotkey.exe",
            "program": "${file}",
            "args": [],
            "stopOnEntry": false,
            "useAdvancedBreakpoint": false,
            "useAdvancedOutput": false,
            "maxChildren": 10000
        }
    ]
}
```

The settings that should be noted are described below.
* `runtime`: Path for AutoHotkey.exe. If you specify a relative path, the installation directory of AutoHotkey becomes the current directory. The extension `.exe` can be omitted. e.g. `AutoHotkeyU64` `v2/AutoHotkey.exe`
* `runtime_v1`, `runtime_v2`: If you want to change AutoHotkey runtime by extension, you need to change this setting. `runtime_v1` corresponds to `ahk`, and `runtime_v2` corresponds to `ahk2` or `ah2`. The setting method is the same as `runtime`.
* `program`: Executable or file to run when launching the debugger.
* `args`: Arguments passed to `program`.
* `env`: Environment variables. If null is specified, it is treated as an empty string.
* `stopOnEntry`: If true, stop at the first line. Set to true if you want it to be the same as Scite4AutoHotkey.
* `useAdvancedBreakpoint`: Unlock conditional breakpoints, etc. See [Advanced breakpoints](#Advanced-breakpoints-(Optional)) for details
* `useAdvancedOutput`: Make the output method equivalent to [Log point](#log-point). This is useful when you want to output an object.
* `maxChildren`: Maximum number of child elements to get. It is necessary to change it when handling an array exceeding 10000.
* `openFileOnExit`: The absolute path of the file to open when the debugger exits. If you have a file that you want to edit immediately after debugging, you should set this feature. You can save the trouble of switching files. If you want to turn this feature off, set it to null or omit it.

# Features
## Data inspection
![data-inspection](image/data-inspection.gif)

You can see the data contents of the variables. However, v2 cannot see some data. Probably because of the alpha version.

If `VariableName` is requested by another function, it means the name displayed by this function. Note that unlike AutoHotkey, it is case sensitive. e.g. `variable`, `obj.field`, `obj["spaced key"]`, ` arr[0]`

Note. `A_DebuggerName` is added at the start of debugging, following Scite4AutoHotkey. This allows you to execute certain code only while you are debugging.

### Rewriting variables
![rewriting-variables](image/rewriting-variables.gif)

The value of the variable can be rewritten. (Primitive value only)
Specifically, the following types are supported.
* `String` e.g `"string"`
* `Number`
    * `Integer`: Treated as a `intger`. e.g. `123`
    * `Float`: Treated as a `string`. v2 is an `intger`. e.g. `123.456`
    * `Hex`: Converted to intger and treated as `integer`. e.g. `0x123`
    * `Scientific`: Treated as a `string`. Converted to `float` in v2. e.g. `1e3` `3.0e+5`

### Data inspection when hover
![data-inspection-when-hover](image/data-inspection-when-hover.gif)

You can see the data displayed in the [data inspection](#data-inspection) by hovering over the variable.
However, the correspondence is only dot notation like `obj.field`.
Bracket notation like `arr[1]` is not supported by the vscode specification.

## Call stack
![call-stack](image/call-stack.gif)

You can check or change the variables for each stack.

## Breakpoints
You can learn the basics [here](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)

## Advanced breakpoints (Optional)
### Before use
**This feature is experimental and subject to change.
Also note that Condition evaluation is slow.**
Therefore it is off by default.

### How to enable
`useAdvancedBreakpoint` to `true` in launch.json.
```json
{
    ...
    "useAdvancedBreakpoint": true
    ...
}
```

### Conditional breakpoint
![conditional-breakpoint](image/conditional-breakpoint.gif)

#### Condition expresion
##### Grammer
```md
# The inside of `[]` can be omitted.

Value [Operator Value]
```

e.g. `A_Index == 30`, `20 <= person.age`, `person.name ~= "i)J.*"`

##### Rules
* `Value`: `VariableName` or `Primitive`
* `VariableName` Property name displayed in [data inspection](#data-inspection) (only properties with primitive values are supported). Note that the case must match. e.g. `variable`, `object.field`, `object["spaced key"]`, `array[1]`
* `Primitive` AutoHotkey primitives. e.g. `"string"`, `123`, `123.456`, `0x123`
* `Operator`
    * `=` Equal ignore case
    * `==` Equal case sensitive
    * `!=` Not equal ignore case
    * `!==` Not equal case sensitive
    * `~=` Compare with regular expression (AutoHotkey like). e.g. `123 ~= "O)\d+"`
        * Note. Regular expression like AutoHotkey is converted to JavaScript regular expression. for that reason I cannot use some feature such as `(?R)`. But in most cases you won't mind.
    * `>` Greater than
    * `>=` Greater than or equal
    * `<` Less than
    * `<=` Less than or equal

### Hit count breakpoint
![hit-count-breakpoint](image/hit-count-breakpoint.gif)

##### Grammer
```md
# You don't need to enter anything in `{}`
# The inside of `[]` can be omitted.

{NumberOfHits} [Operator] Intger
```

e.g. `= 30`, `<= 30`

##### Rules
* `NumberOfHits` Number of breakpoint hits (no need to enter)
* `Operator` If omitted, it is equivalent to `>=`
    * `= or ==` Same as `NumberOfHits == Intger`
    * `>` Same as `NumberOfHits > Intger`
    * `>=` Same as `NumberOfHits >= Intger`
    * `<` Same as `NumberOfHits < Intger`
    * `<=` Same as `NumberOfHits <= Intger`
    * `%` Equivalent to `Mod(NumberOfHits, Intger) == 0`
* `Intger` e.g. `30`

### Log point
![log-point](image/log-point.gif)

Print a message to standard output. If you set a message, it will not stop at the breakpoint.
If the condition is set, the message is output only when the condition is passed.

By describing like `{VariableName}`, the value of the variable can be output. The `VariableName` must exactly match the name displayed in the [data inspection](#data-inspection).

If you want to show the curly braces, you can escape it by prefixing it with `\` like `\{` or `\}`.

e.g. `count: {A_Index}`, `name: {person.name}`

## Watch expression
![watch-expression](image/watch-expression.gif)

Only `VariableName` is supported.
The `VariableName` must exactly match the name displayed in the [data inspection](#data-inspection).

## Loaded scripts
![loaded-scripts](image/loaded-scripts.gif)

Shows the files that are actually loaded.

Supports both explicit loading using `#Include` and implicit loading of [function libraries](https://www.autohotkey.com/docs/Functions.htm#lib)

## Standard output
Supports standard output. You can output a string to the [debug console panel](https://code.visualstudio.com/docs/editor/debugging) using the following function or command.
* [FileAppend](https://www.autohotkey.com/docs/commands/FileAppend.htm)
* [FileOpen](https://www.autohotkey.com/docs/commands/FileOpen.htm)
* [OutputDebug](https://www.autohotkey.com/docs/commands/OutputDebug.htm)

## Advanced standard output
**This feature is experimental and subject to change.**

Output method can be made equivalent to [Log point](#log-point) by enabling `useAdvancedOutput`.
This is useful when you want to output an object.

# Change log
See [CHANGELOG](CHANGELOG.md)

# Issues
If you have issues you can report [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues).
