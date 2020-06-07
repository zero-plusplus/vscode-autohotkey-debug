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