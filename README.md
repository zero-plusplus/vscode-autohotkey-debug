# Before reading
Please note the following first.
* This document has been **translated from Japanese to English** by Google Translate.
* **This extension alone will not work**. You will need to separately install an extension that supports AutoHotkey language(Most famous is `slevesque.vscode-autohotkey`). If you are using AutoHotkey v2 you should look for an extension that supports ah2 and ahk2(For example `dudelmoser.vscode-autohotkey2`). I plan to make an all-in pack, but it will take time because I will make it from scratch for studying.
* It is expected that there are still many potential bugs. Please report to [issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues).
* If you want to update, please see News first. It may contain important information.
* The new version may have defects. In that case, please refer to the [CHANGELOG](CHANGELOG.md) and reinstall the previous version.

# News
### Important Notices
This is a notice to those who are setting launch.json and debugging. From version 1.3.7 the debugger type has changed from `ahk` to `autohotkey`. This is a change to avoid being mistaken for a file extension.
You can debug with `ahk` for a while (however, an error will be displayed), but it will not be usable in the future, so please change as soon as possible.

### Update
* 1.4.2 - 2020-06-26
    * Fixed: [#16](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/16) Broken link to `Advanced breakpoint` in README(`Details` when viewed from vscode)
    * Changed: [#17](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/17) The `port` in launch.json has been extended to allow you to declare a range of ports to use. This allows you to suppress the confirmation message.
* 1.4.1 - 2020-06-23
    * Fix: v1 only bug. Can rewrite variables with scientific notation that uses integers that are not allowed in v1 like `1e+5`. In v1 it needs to be Float like `1.0e+5`
    * Fix: v1 only bug. Can't get properties using `<base>` like `obj.<base>` in watch expression
    * Fix: The icon remains in the system tray when you finish debugging
    * Fix: [#15](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/15) v2-a112 only bug. Rewriting the error message to treat the path as a link containing line number, but it does not work in `a112`
* 1.4.0 - 2020-06-16
    * Added: `runtimeArgs` and `runtimeArgs_v1` and `runtimeArgs_v2` to launch.json
    * Changed: Output the startup command of AutoHotkey
    * Fixed: [#14](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/14) Broken link to issues in README(`Details` when viewed from vscode)

See [CHANGELOG](CHANGELOG.md) for details.

# Overview
I made it for the purpose of replacing the debugger of Scite4AutoHotkey.
So you can use all the features it can.
In addition to that, I am implementing new features such as conditional breakpoints.
All features can be found in [`Features`](#features).

The following features are not supported due to restrictions
* Attach to a script that is already running

### About AutoHotkey_H
I'm not familiar with [AutoHotkey_H](https://hotkeyit.github.io/v2/) so I can't guarantee it, but it should be possible to debug without problems.

However, there are source code differences between the AutoHotkey Debugger and the AutoHotkey_H Debugger, which may contain specific bugs.

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
            "type": "autohotkey",
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
* `runtime_v1`, `runtime_v2`: Similar to `runtime`, but `runtime_v1` corresponds to `ahk` and `runtime_v2` corresponds to `ahk2` or `ah2`.
* `runtimeArgs`: **Many people do not need to change this setting. Any changes may cause debugging to fail.** Arguments you want to pass to AutoHotkey.exe. It corresponds to Switches described in [here](https://www.autohotkey.com/docs/Scripts.htm#cmd). `/Debug` is ignored. This is because it is set on the debugger side
* `runtimeArgs_v1`, `runtimeArgs_v2`: Similar to `runtimeArgs`, but `runtimeArgs_v1` corresponds to `ahk` and `runtimeArgs_v2` corresponds to `ahk2` or `ah2`.
* `port`: You need to change this number if you want to debug multiple source code at the same time using different vscode instances. For example, `9001`, `9002`. You can also declare a range of port numbers that may be used by setting a string like `"start-last"`. `start` and `last` are numbers. Also, it must be `start < last` For example, `"9000-9010"`. By declaring it, you can suppress the message confirming the port usage.
* `program`: Executable or file to run when launching the debugger.
* `args`: Arguments passed to `program`.
* `env`: Environment variables. If null is specified, it is treated as an empty string.
* `stopOnEntry`: If true, stop at the first line. Set to true if you want it to be the same as Scite4AutoHotkey.
* `useAdvancedBreakpoint`: Unlock conditional breakpoints, etc. See [Advanced breakpoints](#advanced-breakpoints-optional) for details
* `useAdvancedOutput`: Make the output method equivalent to [Log point](#log-point). This is useful when you want to output an object.
* `maxChildren`: Maximum number of child elements to get. It is necessary to change it when handling an array exceeding 10000.
* `openFileOnExit`: The absolute path of the file to open when the debugger exits. If you have a file that you want to edit immediately after debugging, you should set this feature. You can save the trouble of switching files. If you want to turn this feature off, set it to null or omit it.

# Features
## Data inspection
![data-inspection](image/data-inspection.gif)

You can see the data contents of the variables. However, v2 cannot see some data. Probably because of the alpha version.

If `VariableName` is requested by another function, it means the name displayed by this function. Note that unlike AutoHotkey, it is case sensitive. e.g. `variable`, `obj.field`, `obj["spaced key"]`, ` arr[0]`

However, `<base>` is given an alias of `base`.
That is, the following Variable Names are treated the same.
* `instance.<base>`
* `instance.base`

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
    * `Scientific`: Treated as a `string`. Converted to `float` in v2. e.g. `3.0e+5`

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

In addition, there are the following restrictions.
* Set an Advanced Breakpoint and cross that line with step ins, outs, and overs.
At this time, even if the result of the condition is false, it will be forcibly stopped.
This is due to a design limitation.

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
* `VariableName` Property name displayed in [data inspection](#data-inspection)  Note that the case must match. e.g. `variable`, `object.field`, `object["spaced key"]`, `array[1]`
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

### About error message
There are two types of error messages in AutoHotkey: load-time error and runtime error.

The load-time error outputs the file path, whereas the runtime error does not output the path.
Moreover, it is a little inconvenient specification such as displaying a message box regardless of the setting of [ErrorStdOut](https://www.autohotkey.com/docs/commands/_ErrorStdOut.htm).

If you want all errors to be the same as load-time error, add the [this code](https://gist.github.com/zero-plusplus/107d88903f8cb869d3a1600db51b7b0a) to your script.

### Advanced standard output (Optional)
**This feature is experimental and subject to change.**

Output method can be made equivalent to [Log point](#log-point) by enabling `useAdvancedOutput`.
This is useful when you want to output an object.

# Change log
See [CHANGELOG](CHANGELOG.md)

# Issues
If you have issues you can report [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues).
