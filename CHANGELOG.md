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

## [1.0.2] - 2020-05-26 [YANKED]
### Fixed
* If the script is in Persistent mode, for example because it defines a hotkey, the process would stop when leaving the scope
* Debug fails if script path is UNC

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
[1.0.2]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.1..v1.0.2
[1.0.1]: https://github.com/zero-plusplus/vscode-autohotkey-debug/compare/v1.0.0..v1.0.1
[1.0.0]: https://github.com/zero-plusplus/vscode-autohotkey-debug/tree/v1.0.0