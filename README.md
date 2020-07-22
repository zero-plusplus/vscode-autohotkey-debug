# Before reading
Please read the following first.
* This document has been translated from Japanese to English using DeepL Translate

* **This extension will not work alone.**
A separate extension that supports the AutoHotkey language is required(The most famous is slevesque.vscode-autohotkey). If you are using AutoHotkey v2, another extension that supports it required. (For example, `dudelmoser.vscode-autohotkey2`)

* Please report any bugs or feature requests in [issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues)(Github account is required)

* Before you update, please look at the News below this first. It may contain important information. Also, there may be a fatal bug in the new version. If this is the case, please refer to [CHANGELOG](CHANGELOG.md) to downgrade it

# News
### Important Notices
* This is a notification for people who debug using launch.json. As of version 1.3.7, the `type` of launch.json has been changed from `ahk` to `autohotkey`. This is to prevent it from being misinterpreted as a file extension. You need to edit the launch.json as soon as possible

* The specification that `VariableName` is case sensitive was my mistake, not a spec in the AutoHotkey debugger. This bug was fixed in `1.3.0`, but I wasn't aware of it myself, so the correction was delayed. I'm sorry

### Update
* `1.4.7` - 2020-07-16
    * Fixed: launch.json warns that `program` is not specified
    * Fixed: Document
        * Corrected the description of `VariableName`

* `1.4.6` - 2020-07-13
    * Change: Process the file information output by [#Warn](https://www.autohotkey.com/docs/commands/_Warn.htm) so that vscode can recognize it as a link
    * Fixed: In Loaded Scripts
        * The commented [#Include](https://www.autohotkey.com/docs/commands/_Include.htm) directive is loaded. If that fails to load, the debug UI goes wrong
        * The script itself is not displayed

* `1.4.5` - 2020-07-03
    * Fixed: Conditional breakpoint only bug. Some escape sequences do not work

See [CHANGELOG](CHANGELOG.md) for details.

# Overview
This extension was designed to be upwardly compatible with the SciTE4AutoHotkey debug adapter.
So you can use all of it's features as well as new features such as conditional breakpoints.

See [`Features`](#features) for more information.

### Unsupported
The following features cannot be implemented due to specifications.
* Attach to a running script

### About AutoHotkey_H
It should be possible to debug [AutoHotkey_H](https://hotkeyit.github.io/v2/), but I'm not familiar with it so I can't guarantee it will work.

# Installation
1. Install [AutoHotkey](https://www.autohotkey.com/)
2. Install an extension to support AutoHotkey (the famous ` slevesque.vscode-autohotkey`)
3. Press `Ctrl + P`, type `ext install zero-plusplus.vscode-autohotkey-debug`

# Usage
1. Open a file with the extension `ahk`, `ahk2` or `ah2`.
2. Place the breakpoints where you want them
3. Press `F5`

# Customize the launch configuration
If you want to change the settings of the debugger, you need to edit the `launch.json` file.
You don't need to see this section if the default settings are sufficient for you.

You can learn the basics of `launch.json` [here](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

Some noteworthy settings are described below.

* `runtime`: The path to AutoHotkey.exe.
If you specify a relative path, the installation directory for AutoHotkey will be the current directory.
You can also omit the extension. For example, `v2/AutoHotkey`, `${workspaceFolder}/AutoHotkey`

* `runtime_v1`, `runtime_v2`: Similar to `runtime`, but used to set each file extension. `runtime_v1` is used for `.ahk` and `runtime_v2` for `.ahk2`, `.ah2`. If the `runtime` is set, it takes precedence

* `runtimeArgs`: **Most people don't need to change this setting. If you set it wrong, debugging may fail.** Arguments to pass to AutoHotkey.exe. You can see a description of the argument [here](https://www.autohotkey.com/docs/Scripts.htm#cmd), described as a Switch. However, `/debug` will be ignored

* `runtimeArgs_v1`, `runtimeArgs_v2`: Similar to `runtimeArgs`, but used to set each file extension. `runtimeArgs_v1` is used for `.ahk` and `runtimeArgs_v2` for `.ahk2`, `. ah2`. If the `runtimeArgs` is set, it takes precedence

* `port`: You need to assign one port to each script, so if you want to debug multiple scripts at the same time, assign different values to each. If the configured port is in use, a confirmation message will be displayed asking if you want to use another port. If you want to suppress this message, you should declare the range of ports you can use, such as `"9000-9010"`

* `program`: The absolute path to the script you want to debug

* `args`: Arguments to be passed to `program`

* `env`: Environment variable to be set during debugging; if set to null, it will be treated as an empty string

* `stopOnEntry`: If `false`, it runs until it stops at a breakpoint. Set it to `true` if you want it to stop at the first line, as in SciTE4AutoHotkey

* `useAdvancedBreakpoint`: If set to `true`, [advanced breakpoints](#advanced-breakpoints-optional) is enabled

* `useAdvancedOutput`: If set to `true`, [advanced output](#advanced-standard-output-optional) is enabled

* `maxChildren`: The maximum number of child elements to retrieve. Change this value if you have an array or object with more than 10000 elements

* `openFileOnExit`: The absolute path of the script you want to open when the debugging is finished. This is useful if you want to quickly edit a specific script

# Features
## Data inspection
![data-inspection](image/data-inspection.gif)

You can check the data of the variables.


If you see `VariableName` in this document, it's the name of the variable displayed by this feature. It is not case sensitive. For example, `variable`, `object.field`, `obj["spaced key"]`, `array[1]`

As a reminder, you can write `<base>` as `base`. That is, the following two are treated as the same thing.
* `instance.<base>`
* `instance.base`

Note: You can find an unfamiliar variable called `A_DebuggerName` This is a variable that is only set when you are debugging, and also in SciTE4AutoHotkey. By using this variable, you can write code that only runs during debugging.

### Rewriting variables
![rewriting-variables](image/rewriting-variables.gif)

The value of the variable can be overridden by a primitive value.

The following values are supported.
* `String` e.g `"foo"`
* `Number`
    * `Integer`: e.g. `123`
    * `Float`: v1 treats it as a string, v2 treats it as a `Float`. e.g. `123.456`
    * `Hex`: It will be converted to decimal before writing. That is, if the value is `0x123`, it is written as `291`. The type is treated as `Integer` e.g. `0x123`
    * `Scientific`: In v1, it is treated as a string
On v2, it is converted to `Float`. So, `3.0e3` is written as `3000.0`. e.g. `3.0e3`, `3.0e+5`.

### Data inspection when hover
![data-inspection-when-hover](image/data-inspection-when-hover.gif)

You can see the data by hovering over the name of the variable.

If you want to see the data of an object, you can use the It should be a member access syntax like `obj.field`.

The item access syntax, such as `arr[1]` and `obj["spaced key"]`, is Due to the specification of vscode, it is not supported.

## Call stack
![call-stack](image/call-stack.gif)

You can see the current call stack.

You can also click to display the variables of that hierarchy in the [data inspection](#data-inspection).

## Breakpoints
You can learn the basics of breakpoint [here](https://code.visualstudio.com/docs/editor/debugging#_breakpoints)

## Advanced breakpoints (Optional)
### Before use
**This feature is a preview version and the specifications are subject to change. Also, please note that evaluating expressions and retrieving variables take some time.**

The following restrictions apply.
* Step-in, out, and over will force a stop if the advanced breakpoint is passed

### How to enable
`useAdvancedBreakpoint` to `true` in launch.json. See [here](#customize-the-launch-configuration) for details.

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
* `VariableName` Variable name displayed in [data inspection](#data-inspection). e.g. `variable`, `object.field`, `object["spaced key"]`, `array[1]`
* `Primitive` Primitive values for AutoHotkey. e.g. `"string"`, `123`, `123.456`, `0x123`, `3.0e3`
* `Operator`
    * `=` Equal ignore case
    * `==` Equal case sensitive
    * `!=` Not equal ignore case
    * `!==` Not equal case sensitive
    * `~=` Compare with regular expression (AutoHotkey like). e.g. `"Jhon" ~= "i)j.*"`
        * Note: That this is not the same as a pure AutoHotkey regular expression(PCRE). Convert PCRE to a JavaScript regexp using [pcre-to-regexp](https://www.npmjs.com/package/pcre-to-regexp) . This means that PCRE-specific features such as (?R) are not available
    * `>` Greater than
    * `>=` Greater than or equal
    * `<` Less than
    * `<=` Less than or equal

### Hit count breakpoint
![hit-count-breakpoint](image/hit-count-breakpoint.gif)

##### Grammer
```md
# You don't need to enter anything in {}. It is written for the purpose of explanation
# You can omit anything in []

{NumberOfHits} [Operator] Integer
```

e.g. `= 30`, `<= 30`

##### Rules
* `NumberOfHits` Number of hits to breakpoints (not required to be entered)
* `Operator` If omitted, it is equivalent to `>=`
    * `= or ==` Same as `NumberOfHits == Integer`
    * `>` Same as `NumberOfHits > Integer`
    * `>=` Same as `NumberOfHits >= Integer`
    * `<` Same as `NumberOfHits < Integer`
    * `<=` Same as `NumberOfHits <= Integer`
    * `%` Equivalent to `Mod(NumberOfHits, Integer) == 0`
* `Integer` e.g. `30`

### Log point
![log-point](image/log-point.gif)

The log point does not stop, unlike at the break point.
Instead, they print their contents to standard output.
This can be useful if you don't want to put the code for the output in a script.

You can embed the value of a variable by enclosing the `VariableName` in braces. For more information on `VariableName`, see [data inspection](#data-inspection). e.g. `count: {A_Index}`, `name: {person.name}`

If you want to output `{`, use `\{`.

## Watch expression
![watch-expression](image/watch-expression.gif)

Only `VariableName` is supported. Expressions are not supported. For more information on `VariableName`, see [data inspection](#data-inspection).

## Loaded scripts
![loaded-scripts](image/loaded-scripts.gif)

You can see the external script being loaded.

It supports both explicit loading using `#Include` and implicit loading using [function libraries](https://www.autohotkey.com/docs/Functions.htm#lib).

## Standard output
Messages output to standard output are displayed in the [debug console panel](https://code.visualstudio.com/docs/editor/debugging).

There are several ways to output a message to the standard output.
* [FileAppend](https://www.autohotkey.com/docs/commands/FileAppend.htm)
* [FileOpen](https://www.autohotkey.com/docs/commands/FileOpen.htm)
* [OutputDebug](https://www.autohotkey.com/docs/commands/OutputDebug.htm)

### About error message
There are two types of error messages in AutoHotkey: loadtime error and runtime error.

A loadtime error will result in a file path being output, while a runtime error will result in No output. Also, regardless of the [ErrorStdOut](https://www.autohotkey.com/docs/commands/_ErrorStdOut.htm) setting, I get a message box. So the runtime error is a bit inconvenient.

If you want to fix it, add [this code](https://gist.github.com/zero-plusplus/107d88903f8cb869d3a1600db51b7b0a) to your script.

This code will suppress the runtime error message box and make the output the same as the loadtime error.

### Advanced standard output (Optional)
**This feature is a preview version and the specifications are subject to change. Also, please note that evaluating expressions and retrieving variables take some time.**

`useAdvancedBreakpoint` to `true` in launch.json. See [here](#customize-the-launch-configuration) for details.

Make the output specifications the same as the [log point](#log-point).
This is useful if you want to output an object.

# Change log
See [CHANGELOG](CHANGELOG.md)

# Issues
If you find a bug, you can report it [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues)(you need a Github account).
