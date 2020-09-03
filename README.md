# Before reading
Please read the following first.
* This document has been translated from Japanese to English using DeepL Translate

* **This extension will not work alone.**
A separate extension that supports the AutoHotkey language is required(The most famous is slevesque.vscode-autohotkey). If you are using AutoHotkey v2, another extension that supports it required. (e.g. `dudelmoser.vscode-autohotkey2`)

* Before you update, please look at the News below this first. It may contain important information. Also, there may be a fatal bug in the new version. If this is the case, please refer to [CHANGELOG](CHANGELOG.md) to downgrade it

* To support the developers (bug reports, sponsorship, etc.), see [here](#development-support)

# News
### Important Notices
* Advanced output has been removed. See [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/27) for details.

* The specification that `VariableName` is case sensitive was my mistake, not a spec in the AutoHotkey debugger. This bug was fixed in `1.3.0`, but I wasn't aware of it myself, so the correction was delayed. I'm sorry

### Update
* `1.6.0` - 2020-xx-xx
    * Added: [#13](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/13) Support for `Run Without Debugging`
    * Added: [#29](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/29) Add PerfTips
    * Changed: [#27](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/27) Remove Advanced output
    * Changed: [#28](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/28) MetaVariables are now available in several features
    * Changed: [#35](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/35) The exit code is now always displayed
    * Fixed: [#32](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/32) If you set a blank character to a log point, it will not be paused until re-set it
    * Fixed: [#34](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/34) The pause and force stop don't work after an advanced breakpoint
    * Fixed: [#37](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/37) Hit Conditonal Breakpoint's `%` operator is not working
    * Fixed: If the error code is 0, output category is stderr

* `1.5.0` - 2020-08-14
    * Added: Operators in conditional breakpoint
        * The following operators are now available
            * `!~`
            * `is`
            * `in`
            * `&&`
            * `||`
            * `countof`
    * Changed: Conditional breakpoint
        * JavaScript RegExp is now available with the `~=` operator
        * Make `VariableName` parsing more accurate
    * Fixed: The exit process fails with some errors
    * Fixed: In some cases, the `<base>` field of an instance cannot be obtained correctly
    * Fixed: Fail to parse hexadecimal numbers starting from 0 as in `0x012` with conditional breakpoints and variable writing, etc
    * Fixed: v1 only bug. Where some variables cannot be obtained with conditional breakpoint and watch expression

* `1.4.10` - 2020-08-03
    * Changed: The object summary to show only the elements that are actually enumerated (i.e. the base property is not shown)
    * Fixed: A bug in data inspect
        * The summary of objects within an object is not displayed correctly. Occurred in 1.4.8
        * Chunking does not work when opening an array of 101 or more in an object. Occurred in 1.4.8

See [CHANGELOG](CHANGELOG.md) for details.

# Overview
This extension was designed to be upwardly compatible with the SciTE4AutoHotkey debug adapter.
So you can use all of it's features as well as new features such as conditional breakpoints.
It also runs asynchronously, so it runs very fast. Best of all, VSCode's debug UI is great!

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

If you want to run without debugging, choose `Run -> Run Without Debugging` from the menu or press `Ctrl + F5`.

# Customize the launch configuration
If you want to change the settings of the debugger, you need to edit the `launch.json` file.
You don't need to see this section if the default settings are sufficient for you.

You can learn the basics of `launch.json` [here](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

Some noteworthy settings are described below.

* `runtime` :　The path to AutoHotkey.exe. If you specify a relative path, the installation directory for AutoHotkey will be the current directory. You can also omit the extension. e.g. `v2/AutoHotkey`, `${workspaceFolder}/AutoHotkey`

* `runtime_v1`, `runtime_v2` :　Similar to `runtime`, but used to set each file extension. `runtime_v1` is used for `.ahk` and `runtime_v2` for `.ahk2`, `.ah2`. If the `runtime` is set, it takes precedence

* `runtimeArgs` :　**Most people don't need to change this setting. If you set it wrong, debugging may fail.** Arguments to pass to AutoHotkey.exe. You can see a description of the argument [here](https://www.autohotkey.com/docs/Scripts.htm#cmd), described as a Switch. However, `/debug` will be ignored

* `runtimeArgs_v1`, `runtimeArgs_v2` :　Similar to `runtimeArgs`, but used to set each file extension. `runtimeArgs_v1` is used for `.ahk` and `runtimeArgs_v2` for `.ahk2`, `.ah2`. If the `runtimeArgs` is set, it takes precedence

* `port` :　You need to assign one port to each script, so if you want to debug multiple scripts at the same time, assign different values to each. If the configured port is in use, a confirmation message will be displayed asking if you want to use another port. If you want to suppress this message, you should declare the range of ports you can use, such as `"9000-9010"`

* `program` :　The absolute path to the script you want to debug

* `args` :　Arguments to be passed to `program`

* `env` :　Environment variable to be set during debugging; if set to null, it will be treated as an empty string

* `stopOnEntry` :　If `false`, it runs until it stops at a breakpoint. Set it to `true` if you want it to stop at the first line, as in SciTE4AutoHotkey

* `useAdvancedBreakpoint` :　If set to `true`, [advanced breakpoints](#advanced-breakpoints-optional) is enabled

* `useProcessUsageData` :　Add process usage data to the metavariable. See [MetaVariable](#MetaVariable) for details. Note that if you enable this setting, step-execution is slow

* `usePerfTips` :　You can enable/disable [PerfTips](#PerfTips).If true, when debugging is break, exectue time is displayed on the current line. Specify a string to change what is displayed, or an object to change more specific settings. If you set the string, it is the same as setting the `usePerfTips.format`.
    * `usePerfTips.format` :　Content to be displayed. You can use the MetaVariable and AutoHotkey variables. In that case, use `{{MetaVariableName}}` and `{AutoHotkeyVariableName}`. Default: `{{executeTime_s}}s elapsed`
    * `usePerfTips.fontColor` :　Set the [color](https://developer.mozilla.org/en-US/docs/Web/CSS/color) of CSS.
    * `usePerfTips.fontStyle` :　Set the [font-style](https://developer.mozilla.org/en-US/docs/Web/CSS/font-style) of CSS.

* `maxChildren` :　The maximum number of child elements to retrieve. Change this value if you have an array or object with more than 10000 elements

* `openFileOnExit` :　The absolute path of the script you want to open when the debugging is finished. This is useful if you want to quickly edit a specific script

# MetaVariable
Some features make use of the information available to the debugger adapter. This is called `MetaVariable`.

When used, enclose the name of the `MetaVariable` in curly brackets. It is not case sensitive. e.g. `{MetaVariableName}`

The available MetaVariables are listed below.

* `{file}` :　Current file name. Equivalent to [A_LineFile](https://www.autohotkey.com/docs/Variables.htm#LineFile).

* `{line}` :　Current line number. Equivalent to [A_LineNumber](https://www.autohotkey.com/docs/Variables.htm#LineNumber).

* `{hitCount}` :　 hit count of breakpoint

* `{condition}` :　 Condition of the breakpoint

* `{hitCondition}` :　Condition of the hit breakpoint

* `{logMessage}` :　Message of the log point

* `{executeTime_ns}`
* `{executeTime_ms}`
* `{executeTime_s}` :　Time taken to execute. The suffix indicates the unit of measurement: `ns`(nanosecond), `ms`(millisecond), `s`(second). Note that by specification, this will be slower than the actual execute time

The following is available if `useProcessUsageData` is enabled

* `{usageCpu}` :　Current CPU usage (Unit: %)

* `{usageMemory_B}`
* `{usageMemory_MB}` :　Current memory usage. The suffix indicates the unit of measurement: `B`(byte), MB(megabyte)

# Features
## Data inspection
![data-inspection](image/data-inspection.gif)

You can check the data of the variables.

#### About VariableName
If you see `VariableName` in this document, it's the name of the variable displayed by this feature. It is case-insensitive.

The object's child elements are the same as in the running script, and can be specified in dot syntax or array index syntax. Which method is available depends on the version of AutoHotkey, v1 can use either method. e.g. `obj.field`, `obj["field"]`, `arr[1]`

Although the `<base>` field is named only in the debugger, it is OK to specify it as `obj.base` as in the actual script.

#### About A_DebuggerName
This is a variable that is only set when you are debugging, and also in SciTE4AutoHotkey. By using this variable, you can write code that only runs during debugging.

### Rewriting variables
![rewriting-variables](image/rewriting-variables.gif)

The value of the variable can be overridden by a primitive value.

The following values are supported.
* `String` :　e.g `"foo"`

* `Number`

    * `Integer` :　e.g. `123`

    * `Float` :　v1 treats it as a string, v2 treats it as a `Float`. e.g. `123.456`

    * `Hex` :　It will be converted to decimal before writing. That is, if the value is `0x123`, it is written as `291`. The type is treated as `Integer` e.g. `0x123`

    * `Scientific` :　In v1, it is treated as a string
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
Note: I am not familiar with the parser and evaluation of expressions, so this is a minimal implementation.

##### Grammer
```md
# The inside of `[]` can be omitted.

Expression1 [LogicalOperator1 Expression2, LogicalOperator2 Expression3...]
```

e.g.
* `A_Index == 30`

* `20 <= person.age`

* `person.name ~= "i)J.*"`

* `100 < countof list`

* `variable is "string"`, `object is "object:Func"`, `instance is ClassObject`

* `"field" in Object`, `keyName not in Object`

* `object is Fowl || "wing" in object && "beak" in object`

##### Rules
* `Expression` :　`Value [Operator Value]`

* `Value` :　`VariableName` or `Primitive`

* `VariableName` :　Variable name displayed in [data inspection](#data-inspection). e.g. `variable`, `object.field`, `object["spaced key"]`, `array[1]`

* `MetaVariableName` :　Please Look at [MetaVariableName](#MetaVariableName)

* `Primitive` :　Primitive values for AutoHotkey. e.g. `"string"`, `123`, `123.456`, `0x123`, `3.0e3`

* `Operator`

    * Prefix operators :　 Unlike other operators, it is specify before `Value`. Note that it is not case sensitive and requires at least one trailing space. e.g. `countof list`

        * `countof` :　If `Value` is a primitive value, the number of characters is returned. In the case of an object, it returns the number of elements. However, in the case of an array, it returns the length

    * Logical operators :　Specify `Expression` on the left and right

        * `&&` :　Returns false if the left expression is false. If not, return right

        * `||` :　Returns true if the left expression is true. If not, return right

    * Comparison operators :　Specify `Value` on the left and right. The `is` or `in` operator must have at least one space before and after it

        * `=` :　Equal ignore case

        * `==` :　Equal case sensitive

        * `!=` :　Not equal ignore case

        * `!==` :　Not equal case sensitive

        * `~=` :　Compare with [AutoHotkey like RegEx](https://www.autohotkey.com/docs/misc/RegEx-QuickRef.htm) or [Javascript RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). e.g. `name ~= "i)j.*"`, `name ~= /j.*/i`
            * **Note** :　`AutoHotkey like RegEx` is not the same as a pure AutoHotkey regular expression(PCRE). Convert PCRE to a JavaScript RegExp using [pcre-to-regexp](https://www.npmjs.com/package/pcre-to-regexp). This means that PCRE-specific features such as (?R) are not available

        * `!~` :　The negate version of the `~=` operator

        * `>` :　Greater than

        * `>=` :　Greater than or equal

        * `<` :　Less than

        * `<=` :　Less than or equal

        * `is [not]` :　Checks if the value is of a particular type or if it inherits from a particular class. The left side is specified with `VariableName`. The right side specifies the following values. The is operator, left and right sides are all case-insensitive

            * The five basic types are as follows. These can be checked by hovering over the variable names in [data inspection](#data-inspection). e.g. `variable is "string"`, `variable is not "undefined"`

                * `"undefined"` :　Check for uninitialized variable

                * `"string"` :　e.g. `"str"`

                * `"integer"` or `"int"` :　e.g. `123`

                * `"float"` :　e.g. `123.456`

                * `"object"` :　All values other than the primitive values. e.g. `{}`, `[]`

            * Composite types. e.g. `variable is "number"`

                * `"number"` :　Composite types of integer and float

                * `"primitive"` :　Composite types of string, integer and float

            * More detailed type check. e.g. `variable is "number:like"`, `variable is not "object:Func"`

                * `"string:alpha"` :　Checks if it consists of only the alphabet. Same as `variable ~= "^[a-zA-Z]$"`

                * `"string:alnum"` :　Checks if it consists of only the alphabet and numbers. Same as `variable ~= "^[a-zA-Z0-9]+$"`

                * `"string:hex"` :　Checks if the value is in hexadecimal. Same as `variable ~= "^0x[0-9a-fA-F]+$"`

                * `"string:upper"` :　Checks if it consists of only the alphabet of uppercase. Same as `variable ~= "^[A-Z]+$"`

                * `"string:lower"` :　Checks if it consists of only the alphabet of lowercase. Same as `variable ~= "^[a-z]+$"`

                * `"string:space"` :　Checks if it consists of only the white space characters. Same as `variable ~= "^\s+$"`

                * `"string:time"` : 　Checks if it can be interpreted as a date. A date is a string of characters that can be parsed by [Data.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse). e.g. `2000-1-1 00:00:00`

                * `"integer:like"` or `"int:like"` :　Checks if the value can be converted to an integer or an integer. e.g. `123`, `"123"`

                * `"float:like"` or `"int:like"` :　Checks if the value can be converted to a float and not integer, or a float. Returns false if the value is an integer. e.g. `123.456`, `"123.456"`

                * `"number:like"` :　Composite types of integer:like and float:like

                * `"object:ClassName"` :　Checks whether an object is a particular `ClassName`. You can check the `ClassName` by looking at the value of the variable holding the object in [data inspection](#data-inspection)(e.g. `ClassName {...} `). Note that the `ClassName` here is not the same as the value of the `__class` field

            * `VariableName` :　Checks if the class inherits from a specific class. The value of the variable must be an class object. e.g. `instance is ClassObject`

        * `[not] in` :　Check if the object owns or inherits a particular field. Left side is `Primitive` or `VariableName`, and the right side is `VariableName`. e.g. `"key" in Object`, `"key" not in Object`

### Hit Conditional Breakpoint
![hit-conditional-breakpoint](image/hit-conditional-breakpoint.gif)

Break the script when the breakpoint reaches a certain hit count.

You can check your hit count by using [PerfTips](#PerfTips).
Specifically, set the `usePerfTips` in launch.json to `hitCount: {{hitCount}}`.

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

    * `= or ==` :　Same as `NumberOfHits == Integer`

    * `>` :　Same as `NumberOfHits > Integer`

    * `>=` :　Same as `NumberOfHits >= Integer`

    * `<` :　Same as `NumberOfHits < Integer`

    * `<=` :　Same as `NumberOfHits <= Integer`

    * `%` :　Equivalent to `Mod(NumberOfHits, Integer) == 0`

* `Integer` :　e.g. `30`

### Log point
![log-point](image/log-point.gif)

The log point does not stop, unlike at the break point.
Instead, they print their contents to standard output.
This can be useful if you don't want to put the code for the output in a script.

You can embed the value of a variable by enclosing the `VariableName` or `MetaVariable` in braces.

For more information on `VariableName`, see [data inspection](#data-inspection). You can read more about the metavariables [here](#MetaVariable).

 e.g. `count: {A_Index}`, `name: {person.name}`, `{{executeTime_s}}`

If you want to output `{`, use `\{`.

## Watch expression
![watch-expression](image/watch-expression.gif)

`VariableName` or `MetaVariableName` are supported. Expressions are not supported.

For more information on `VariableName`, see [data inspection](#data-inspection). You can read more about the metavariables [here](#MetaVariable).

## Loaded scripts
![loaded-scripts](image/loaded-scripts.gif)

You can see the external script being loaded.

It supports both explicit loading using `#Include` and implicit loading using [function libraries](https://www.autohotkey.com/docs/Functions.htm#lib).

## PerfTips (Optional)
![perftips](image/perftips.gif)

You can use it by setting `usePerfTips` in launch.json.
For more information on setting it up, see [here](#customize-the-launch-configuration).

As with Visual Studio's PerfTips, when debugging is break, the current line displays the execute time. Note that by specification, this will be slower than the actual execute time

Display more information when `useProcessUsageData` is `true`. Note, however, that this will slow down the step-execution.

Note: If you have an extension installed that displays information inline, such as `eamodio.gitlens`, it may be overwritten by that information. Currently, you need to give up one or the other.

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

# Change log
See [CHANGELOG](CHANGELOG.md)

# Known issues
* [Data inspection](#data-inspection) bug. Arrays with a length of 101 or more are chunked into 100 elements each. It is a specification that these headings will be displayed as `[0..99]`. The AutoHotkey array starts at 1 and should be `[1..100]`, but I can't find a way to change the headings, so I can't solve this problem at the moment

* v2 only bug. Trying to get a [dynamic property](https://lexikos.github.io/v2/docs/Objects.htm#Custom_Classes_property) with a conditional breakpoint or a watch expression, etc will cause a critical error

# Development support
## About source code contributes
I am currently not accepting contributions.

I understand that this is a folly to throw away the strength of open-source software, but I believe that I should do all the implementation because the development of this extension includes the purpose of measuring my skills as a programmer.

## About bug reports and feature requests
It is accepted on [Github issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues). (Github account required). Basically, I will reply to you by the same day or the next day, so feel free to report.

## About GitHub Sponsors
I am looking for [GitHub Sponsors](https://github.com/sponsors/zero-plusplus) for $1-$100 per month. However, please note the following

1. There is no rewards for sponsors. This is because development is a priority.
2. I will not stop development just because I don't have a sponsor. So there is no need to be forced to become a sponsor
