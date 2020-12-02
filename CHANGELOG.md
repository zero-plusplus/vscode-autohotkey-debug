# Before reading
Please read the following first.
* This document has been translated from Japanese to English using DeepL Translate

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][Keep a Changelog] and this project adheres to [Semantic Versioning][Semantic Versioning].

## [Unreleased]
If you want to see what the next version of the plan is, check out the [milestones](https://github.com/zero-plusplus/vscode-autohotkey-debug/milestones).
Also want to check the development status, check the [commit history](https://github.com/zero-plusplus/vscode-autohotkey-debug/commits/develop) of the develop branch.

---

## [Released]
## [1.6.5] - 202x-xx-xx
### Changed
* Bundled the extension files and also removed unnecessary files to run. This reduced the file size by a tenth and greatly improved the installation speed

### Fixed
* [#73](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/73) Sparse array being treated as array in `Data inspection`
* v2 only bug. `Loaded scripts` will not work properly if a relative path is used for `#Include`

## [1.6.4] - 2020-11-02
### Fixed
* [#68](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/68) Debug adapter does not exit successfully if a syntax error occurs

## [1.6.3] - 2020-11-02 [YANKED]
**Don't install. Please use `1.6.4`**

### Fixed
* [#65](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/65) If a conditional breakpoint that returns false is passed, the pause button will not work until the next stop
* [#66](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/66) When resume debugging, PerfTips will remain visible until the next stop
* Improve termination process

## [1.6.2] - 2020-10-26
### Changed
* [#56](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/56) Whenever possible, the default value of `runtimeArgs` is set to `[ "ErrorStdOut=UTF-8"]`
* [#64](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/64) Default value of `port` to `9002`
* Improve error message when an invalid value is set by launch.json

### Fixed
* [#63](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/63) Can't get environment variables in the script

## [1.6.1] - 2020-10-06
### Fixed
* [#21](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/21) Special characters are not escaped in data inspection, etc

## [1.6.0] - 2020-10-04
### Added
* [#13](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/13) Support `Run Without Debugging`
* [#28](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/28) Support MetaVariable. This is supported by several features.
* [#29](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/29) Support PerfTips
* [#30](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/30) Support Debug directive
* [#40](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/40) Support IntelliSense, which is only available for debugging

### Changed
* [#27](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/27) Remove Advanced output
* [#35](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/35) The exit code is now always displayed
* [#41](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/41) Remove useAdvancedBreakpoint. Advanced breakpoint is enabled by default
* [#46](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/46) Improved step execution when using Advanced breakpoint. This removed the forced stop

### Fixed
* [#32](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/32) If you set a blank character to a log point, it will not be paused until re-set it
* [#33](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/33) Float values do not work properly at conditional breakpoint
* [#34](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/34) The pause and force stop don't work after an advanced breakpoint
* [#37](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/37) Hit Conditonal Breakpoint's `%` operator is not working
* [#44](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/44) Loaded scripts are not detected when on previous #Include line a directory is specified
* [#45](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/45) Loaded scripts are not detected when on specified  relative path by #Include
* [#48](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/48) If more than one breakpoints in the same line is removed at once, it will not be removed correctly
* [#49](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/49) v1 only bug. `undefinedVariable == ""` returns false
* [#50](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/50) The base field cannot be inspected by a hover
* [#51](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/51) Error occurs when getting dynamic properties by data inspect, etc
* [#53](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/53) Setting a string containing `&` and `|` in a conditional breakpoint always returns false
* [#55](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/55) Chunking doesn't work when a large array is specified in a Watch expression
* [#57](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/57) If the script exits without stopping at a breakpoint, etc., the message containing the object is not printed correctly
* [#58](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/58) Registering or unregistering a breakpoint resets the hit count for all breakpoints
* [#59](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/59) Hit count shifts when pausing while using Advanced breakpoint
* Data inspect shows an array of length 1 as `{1: value}`
* If the error code is 0, output category is stderr
* Blank line printed when outputting object
* In some case, "\{" is output without unescaped in Log point etc
* In some case, debugging may not be successful
* When the Advanced breakpoint is used, the step execution may cause the {hitCount} to go wrong

## [1.5.0] - 2020-08-14
### Added
* Operators in conditional breakpoint
    * The following operators are now available
        * `!~`
        * `is`
        * `in`
        * `&&`
        * `||`
        * `countof`

### Changed
* Conditional breakpoint
    * JavaScript RegExp is now available with the `~=` operator
    * Make `VariableName` parsing more accurate

### Fixed
* The exit process fails with some errors
* In some cases, the `<base>` field of an instance cannot be read-write correctly
* Fail to parse hexadecimal numbers starting from 0 as in `0x012` with conditional breakpoints and variable writing, etc
* v1 only bug. Where some variables cannot be obtained with conditional breakpoint and watch expression, etc

## [1.4.10] - 2020-08-03
### Changed
* The object summary to show only the elements that are actually enumerated (i.e. the base property is not shown)

### Fixed
* A bug in data inspect
    * The overview of objects within an object is not displayed correctly. Occurred in 1.4.8
    * Chunking does not work when opening an array of 101 or more in an object. Occurred in 1.4.8

## [1.4.9] - 2020-07-27
### Fixed
* Some runtime error output does not include a newline at the end of the output. Occurred in 1.4.8

## [1.4.8] - 2020-07-22 [YANKED]
### Changed
* Add links to files in some runtime error messages

### Fixed
* Debugging does not end normally when some errors occur
* Optimization of data inspect. Previously, the same data was retrieved multiple times
* [#24](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/24) v2 only bug. An error occurs when checking a [property](https://lexikos.github.io/v2/docs/Objects.htm#Custom_Classes_property) with data inspect

### Security
* [#23](https://github.com/zero-plusplus/vscode-autohotkey-debug/pull/23) Update vulnerable packages(lodash)

## [1.4.7] - 2020-07-16
### Changed
### Fixed
* launch.json warns that `program` is not specified
* Document
    * Corrected the description of `VariableName`

## [1.4.6] - 2020-07-13
### Changed
* Process the file information output by [#Warn](https://www.autohotkey.com/docs/commands/_Warn.htm) so that vscode can recognize it as a link

### Fixed
* In Loaded Scripts
    * The commented [#Include](https://www.autohotkey.com/docs/commands/_Include.htm) directive is loaded. If that fails to load, the debug UI goes wrong
    * The script itself is not displayed

## [1.4.5] - 2020-07-03
### Fixed
* Conditional breakpoint only bug. Some escape sequences do not work

## [1.4.4] - 2020-07-02
### Fixed
* Conditional breakpoint only bug
    * [#19](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/19) v2 only bug. Single quotation string doesn't work
    * Escape sequences do not work

## [1.4.3] - 2020-06-27
### Changed
* Rewritten the document using the DeepL translate

### Fixed
* The output in the logpoint does not contain line feeds.
* The output ends in `"\0"`

## [1.4.2] - 2020-06-26
### Changed
* [#17](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/17) The `port` of launch.json has been extended to include
It is now possible to declare a range of ports to be used.  This allows you to suppress confirmation messages

### Fixed
[#16](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/16) The link to `Advanced breakpoint` is broken in README (`Details` from vscode)

## [1.4.1] - 2020-06-23
### Fixed
* v1 only bug; you can rewrite a variable with Integer scientific notation. It is not allowed in v1
* v1 only. Cannot use `<base>` in watch expression
* The icon will remain in the system tray when the debug is finished
* [#15](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/15) v2-a112 only bug. Rewrote the error message to treat the path as a link containing a line number, but `a112` Then it won't work

## [1.4.0] - 2020-06-16
### Added
* `runtimeArgs` and `runtimeArgs_v1` and `runtimeArgs_v2` to launch.json

### Changed
* Output the AutoHotkey launch command

### Fixed
* [#14](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/14) The link to `issues` is broken in README (`Details` from vscode)

## [1.3.7] - 2020-06-13
### Important Notices
This is a notification for people who debug using launch.json.
As of version 1.3.7, the `type` of launch.json has been changed from `ahk` to `autohotkey`.
This is to prevent it from being misinterpreted as a file extension.
You need to edit the launch.json as soon as possible.

### Changed
* Debugger type from `ahk` to `autohotkey`

## [1.3.6] - 2020-06-13
### Fixed
* If a script that contains parentheses in the file name produces a loadtime error, the path is displayed a little oddly in be

## [1.3.5] - 2020-06-12
### Changed
* If you want to debug multiple source codes at the same time, a dialog box appears to confirm whether you want to use another port for debugging

## [1.3.4] - 2020-06-10
### Fixed
* A bug when 'useAdvancedBreakpoint' is true. When a conditional breakpoint or a line with a logpoint is passed by step-in, out, or over, the execution continues until the next breakpoint. Changed it to stop regardless of the condition

## [1.3.3] - 2020-06-09
### Changed
* Support for lazy loading of stacked frames. When the stack frame exceeds 20, loading is lazy
* [#10](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/10) Change the message to allow vscode to recognize the file path, including the line number, as a link if an AutoHotkey error occurs

### Fixed
* [#7](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/7) Pressing pause while idling does not display any variables. Not a complete fix due to a specification issue. You must click on the stack frame to view it

## [1.3.2] - 2020-06-09
### Changed
* You can jump to the output source by clicking on the file name to the right of the output, but only if you are outputting at a log point
* Supporting object values in conditional expressions

### Fixed
* When outputting a variable to the debug console, it may refer to a variable of a different scope
* Incorrectly displaying an object's overview
* We can't set the `obj.<base>` in the Watch expression, this is limited to v2. This is restricted to v2. (2020/06/27 This was a mistake and was retracted in 1.4.1)
* Can't rewrite the fields of an object
* If write an Integer, it will be treated as a Float
* The conditional breakpoint was not working

### Removed
* Message at the end of the debugging process Shows how long it took to debug. I didn't need it

## [1.3.1] - 2020-06-07
### Fixed
* [#3](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/3) The breakpoint fails if the file name contains an embedded space followed by a hyphen

## [1.3.0] - 2020-06-07
### Added
* `openFileOnExit` to launch.json
* `useAdvancedOutput` to launch.json
* Global variable `A_DebuggerName`. Followed Scite4Autohotkey

### Changed
* Enhanced standard output
    * Supports object output with `Log point`
    * Supports functions or commands that print to standard output
        * [FileAppend](https://www.autohotkey.com/docs/commands/FileAppend.htm)
        * [FileOpen](https://www.autohotkey.com/docs/commands/FileOpen.htm)
        * [OutputDebug](https://www.autohotkey.com/docs/commands/OutputDebug.htm)
    * Output runtime error to standard error

### Fixed
* The pause and restart didn't work
* Can't get the child elements of an object in a `Watch expression`
* Item access with strings like `obj["spaced key"]` does not work with `Watch expression`

## [1.2.0] - 2020-05-30
### Added
* The setting item of `env` to launch.json

### Changed
* Warn when the value assigned to `args` of `launch.json` is not a string

## [1.1.0] - 2020-05-27
### Added
* The setting item of `args` to launch.json

## [1.0.5] - 2020-05-27 [YANKED]
### Fixed
* If no launch.json is created or `program` is omitted, the Debugging fails. This bug was introduced in 1.0.4

## [1.0.4] - 2020-05-27
**Note: This version is broken. This will be fixed in 1.0.5.**

### Fixed
* Debugging fails if you use [variables](https://code.visualstudio.com/docs/editor/variables-reference) in the `runtime` in launch.json. e.g. `"$ {workspaceFolder}/AutoHotkey.exe"`

## [1.0.3] - 2020-05-26 [YANKED]
### Fixed
* Setting a breakpoint while waiting for a script does not work
* Comparing an empty character with a conditional breakpoint returns false

## [1.0.2] - 2020-05-26 [YANKED]
### Fixed
* If the script is in [persistent mode](https://www.autohotkey.com/docs/commands/_Persistent.htm), the process stops when you leave the scope
* Debugging will fail if the script path is a UNC path

## [1.0.1] - 2020-05-25
### Changed
* If the runtime does not exist, an error will be displayed and debugging will stop. Previously, the user had to stop debugging

## [1.0.0] - 2020-05-23
First released

---

<!-- Links -->
[Keep a Changelog]: https://keepachangelog.com/
[Semantic Versioning]: https://semver.org/

<!-- Versions -->
[1.6.5]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.6.4..v1.6.5
[1.6.4]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.6.3..v1.6.4
[1.6.3]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.6.2..v1.6.3
[1.6.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.6.1..v1.6.2
[1.6.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.6.0..v1.6.1
[1.6.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.5.0..v1.6.0
[1.5.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.10..v1.5.0
[1.4.10]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.9..v1.4.10
[1.4.9]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.8..v1.4.9
[1.4.8]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.7..v1.4.8
[1.4.7]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.6..v1.4.7
[1.4.6]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.5..v1.4.6
[1.4.5]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.4..v1.4.5
[1.4.4]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.3..v1.4.4
[1.4.3]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.2..v1.4.3
[1.4.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.1..v1.4.2
[1.4.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.4.0..v1.4.1
[1.4.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.7..v1.4.0
[1.3.7]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.6..v1.3.7
[1.3.6]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.5..v1.3.6
[1.3.5]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.4..v1.3.5
[1.3.4]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.3..v1.3.4
[1.3.3]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.2..v1.3.3
[1.3.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.1..v1.3.2
[1.3.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.3.0..v1.3.1
[1.3.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.2.0..v1.3.0
[1.2.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.1.0..v1.2.0
[1.1.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.5..v1.1.0
[1.0.5]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.4..v1.0.5
[1.0.4]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.3..v1.0.4
[1.0.3]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.2..v1.0.3
[1.0.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.1..v1.0.2
[1.0.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.0..v1.0.1
[1.0.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/tree/v1.0.0