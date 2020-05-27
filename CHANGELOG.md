# Before reading
Please note the following first.
* This document has been **translated from Japanese to English** by Google Translate.

# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog][Keep a Changelog] and this project adheres to [Semantic Versioning][Semantic Versioning].

## [Unreleased]
All features that the AutoHotkey debugger can execute and the features that can be supported by the extension side are implemented as much as possible, so new functions will not be added. After that, the main thing is to fix bugs or improve processing.

However, there is one feature you can add. That is the function to output objects at log points.
This is not implemented due to my lack of knowledge, so I would appreciate it if someone familiar with it could tell me.

---

## [Released]

## [1.1.0] - 2020-05-27
### Added
* Setting execution arguments

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
[1.1.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.5..v1.1.0
[1.0.5]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.4..v1.0.5
[1.0.4]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.3..v1.0.4
[1.0.3]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.2..v1.0.3
[1.0.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.1..v1.0.2
[1.0.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.0..v1.0.1
[1.0.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/tree/v1.0.0