**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many advanced features in addition to the basic [debugging features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features).

# News
### Important Notices
* Much of the README content has been migrated to the [Github wiki](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki). If you want to see the description of each feature, please refer to there

* Since `1.8.0` is a relatively large update with additions and fixes, there may be new bugs. If you find any, please report them in [Issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues)

### Update
* `1.9.0` - 2021-xx-xx
    * Added: [#69](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/69) Support `skipFiles` and `skipFunctions`
    * Added: [#143](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/143) Support the `extends` attribute to launch.json

* `1.8.0` - 2021-09-23
    * Added: [#67](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/67) Support attach mode
    * Added: [#78](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/78) `useUIAVersion` to launch.json
    * Changed: [#129](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/129) Only when using `useAutoJumpToError`. When jumping to an error, highlight the jump destination for a short while
    * Changed: [#131](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/131) Enable the disconnect button
    * Fixed: [#130](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/130) When the error code is `0`, the debug exit message is not displayed
    * Fixed: [#133](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/133) v2 only bug. Debugging crashes when trying to look at a child element of an instance of a class with `__Enum` meta-function
    * Fixed: [#135](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/135) v2 only bug. Hovering over `&variable` does not show variable information
    * Fixed: [#135](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/135) Information is not displayed when uninitialized variable names are hovered over
    * Fixed: [#137](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/137) If `${file}` is set to `openFileOnExit` when the editor is not open, an error occurs and debugging cannot be started
    * Fixed: [#138](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/138) Conditional breakpoints do not recognize boolean values
    * Fixed: [#139](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/139) v2 only bug. Conditional breakpoints cannot compare numbers in scientific notation correctly

* `1.7.1` - 2021-08-17
    * Fixed: [#118](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/118) `Copy Value` does not work in Variables View

See [CHANGELOG](CHANGELOG.md) for details.

# Installation
1. Install [Visual Studio Code](https://code.visualstudio.com/) with version `1.45.0` or higher
2. Install [AutoHotkey](https://www.autohotkey.com/)
3. Install an extension to support AutoHotkey (the famous `slevesque.vscode-autohotkey`)
4. Press `Ctrl + P`, type `ext install zero-plusplus.vscode-autohotkey-debug`

This extension will look for the AutoHotkey runtime to use for debugging as follows.
* v1: `C:/Program Files/AutoHotkey/AutoHotkey.exe`
* v2: `C:/Program Files/AutoHotkey/v2/AutoHotkey.exe`

If you want to place the runtime in a different location, or use a different variant of the runtime such as AutoHotkey_H, set the [runtime](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Launch-Mode) attribute in [launch.json](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

## About AutoHotkey_H
I'm not familiar with [AutoHotkey_H](https://hotkeyit.github.io/v2/), but like AutoHotkey, it uses [DBGP](https://xdebug.org/) and should be able to be debugged without problems.
However, the implementation is a bit different, so there may be some inherent bugs that may occur.

If you find a bug, please report it to [issues](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues).

# Usage
1. Open a file with the extension `.ahk`, `.ahk2` or `.ah2`.
2. Set [Breakpoint](#breakpoint) where you want them
3. Press `F5`

If you want to run without debugging, choose `Run -> Run Without Debugging` from the menu or press `Ctrl + F5`.

For more information on how to use many of the other features, see [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki).

# Contributes
I am currently not accepting source code contributions (i.e. Pull Request). Instead, you can report bugs and request features in Issues.

I usually reply by the next day.

# Donate
If you like this extension, please consider becoming a [donate or sponsor](https://github.com/sponsors/zero-plusplus) (Github account required).

**Please note, however, that I have not setup a reward, as I am dedicated to development.**