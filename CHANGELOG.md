# Before reading
Please note the following first.
* This document has been **translated from Japanese to English** by Google Translate.

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][Keep a Changelog] and this project adheres to [Semantic Versioning][Semantic Versioning].

## [Unreleased]
Mainly bug fixes and processing improvements.

---

## [Released]
## [1.3.7] - 2020-06-13
### Important Notices
This is a notice to those who are setting launch.json and debugging. From this version the debugger type has changed from `ahk` to `autohotkey`. This is a change to avoid being mistaken for a file extension.
You can debug with `ahk` for a while (however, an error will be displayed), but it will not be usable in the future, so please change as soon as possible.

### Changed
* Debugger type from `ahk` to `autohotkey`

## [1.3.6] - 2020-06-13
### Fixed
* The path is displayed a little strange when a runtime error is output in a script that includes parentheses in the file name

## [1.3.5] - 2020-06-12
### Changed
* When debugging multiple source code at the same time, show a dialog asking if you want to debug using another port

## [1.3.4] - 2020-06-10
### Fixed
* When you step in, out, or over a line with a conditional breakpoint or logpoint, it continues to run until the next breakpoint. It was changed to stop regardless of the conditions. Also, this bug is limited when `useAdvancedBreakpoint` is true.

## [1.3.3] - 2020-06-09
### Changed
* Support for lazy loading of stack frames. Loading is delayed when there are 20 more than stack frames
* [#10](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/10) Output after molding so that vscode can be recognized as a link at runtime error of AutoHotkey

### Fixed
* [#7](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/7) Variables are not displayed when you press pause while idling. It is not a complete fix due to a specification problem

## [1.3.2] - 2020-06-09
### Changed
* Although it is limited to when outputting with log points, it is possible to jump to the output source by clicking the file name on the right side of the output
* Support object values in conditional expressions

### Fixed
* When outputting a variable to the debug console, a variable in another scope may be referenced
* Incorrect display of object summary
* Cannot set `obj.<base>` in `Watch expression`. This is limited to ahkv2
* Can't rewrite field of object
* Writing an integer is treated as a floating point
* Conditional breakpoint was not working

### Removed
* Message at the end of debugging. I was showing the time spent debugging but I didn't need it

## [1.3.1] - 2020-06-07
### Fixed
* [#3](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/3) Breakpoints fail if filename has embedded space followed by hyphen

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
* Pause and restart did not work for debug actions
* Cannot get child element of object with `Watch expression`
* The value cannot be obtained if it is an index accessor using a string such as `obj["spaced key"]` with `Watch expression`

## [1.2.0] - 2020-05-30
### Added
* The setting item of `env` to launch.json

### Changed
* Warn if the value assigned to `args` in launch.json is a non-string

## [1.1.0] - 2020-05-27
### Added
* The setting item of `args` to launch.json

## [1.0.5] - 2020-05-27 [YANKED]
### Fixed
* Debug will fail if launch.json is not created or "program" is omitted. This bug occurred in 1.0.4

## [1.0.4] - 2020-05-27
**Note: This version is broken. This will be fixed in 1.0.5.**

### Fixed
* If you specify a path using a [variable](https://code.visualstudio.com/docs/editor/variables-reference) in runtime in launch.json, the path is not set correctly and debugging fails. For example `${workspaceFolder}/AutoHotkey.exe`

## [1.0.3] - 2020-05-26 [YANKED]
### Fixed
* Setting breakpoints while the script is waiting does not work. This makes hotkey debugging easier.
* Returns false when comparing empty characters in conditional breakpoint

## [1.0.2] - 2020-05-26 [YANKED]
### Fixed
* If the script is in Persistent mode, for example because it defines a hotkey, the process would stop when leaving the scope
* Debug fails if the script path is a UNC path starting with `\\`

## [1.0.1] - 2020-05-25
### Changed
* Displays an error if the runtime does not exist. Previously the process stopped until the user stopped debugging.

## [1.0.0] - 2020-05-23
First released

---

<!-- Links -->
[Keep a Changelog]: https://keepachangelog.com/
[Semantic Versioning]: https://semver.org/

<!-- Versions -->
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