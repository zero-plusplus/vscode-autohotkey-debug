**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

# News
## Important Notices
* Raised the supported vscode version from `1.49.0` to `1.63.0` to use the [pre-release](https://code.visualstudio.com/updates/v1_63#_pre-release-extensions)


## Update
* `2.0.0` - 2023-xx-xx
    * Added: [#31](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/31) Add Function breakpoint
    * Added: [#224](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/224) Add `{callstack.trace}` to the MetaVariable
    * Added: [#257](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/257) Add Exception Breakpoint
    * Added: [#264](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/264) Add `vscode-autohotkey-debug.commands.runToEndOfFunction` vscode command
    * Added: [#271](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/271) Add `vscode-autohotkey-debug.variables.pinnedFile` [command variable](https://code.visualstudio.com/docs/editor/variables-reference#_command-variables)
    * Added: [#271](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/271) Add `vscode-autohotkey-debug.variables.leftmostFile` [command variable](https://code.visualstudio.com/docs/editor/variables-reference#_command-variables)
    * Added: [#271](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/271) Add `vscode-autohotkey-debug.variables.rightmostFile` [command variable](https://code.visualstudio.com/docs/editor/variables-reference#_command-variables)
    * Changed: [#60](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/60) Change to suppress error dialogs if runtime supports them
    * Changed: [#116](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/116) Enhanced conditional breakpoint
    * Changed: [#225](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/225) Remove escape process of output text in debug directives
    * Changed: [#238](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/238) Change breakpoint directive to break regardless of output
    * Changed: [#239](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/239) Raise the supported vscode version from `1.49.0` to `1.63.0` for using the pre-release
    * Changed: [#261](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/261) Support the expression in watch expression
    * Changed: [#269](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/269) Support the expression evaluate in debug console
    * Changed: [#270](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/270) Support expression in log point
    * Fixed: [#207](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/207) Attach fails if file path contains multibyte strings
    * Fixed: [#212](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/212) Some errors were not detected and raw error messages were output. This caused `useAutoJumpToError` to not work in some cases
    * Fixed: [#215](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/215) The list of running AutoHotkey processes displayed before attaching does not display correctly when it contains multibyte strings
    * Fixed: [#220](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/220) Grouping of messages using Debug Directive is not working, such as `; @Debug-Output:start`, `; @Debug-Output:end`
    * Fixed: [#229](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/229) Raw error message on Critical Error
    * Fixed: [#232](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/232) Output of members in bracketed notation in Output directive, Watch expression, etc. may not be evaluated correctly
    * Fixed: [#234](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/234) Breakpoint do not work when `runtime` is a UNC path (e.g. `//server/folder`)
    * Fixed: [#236](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/236) Debugging gets stuck if the last line of the included script is a debug directive
    * Fixed: [#254](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/254) When a string containing `#` is displayed in `View Value` and `View as Text` in the Variable View context menu, the subsequent string is not displayed
    * Fixed: [#255](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/255) Objects with child elements in index notation such as `["a & -"]` may get stuck when retrieving child elements
    * Fixed: [#256](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/256) v2 only bug. If double/single quotes are used in #Include directive, they do not appear in Loaded Scripts
    * Fixed: [#262](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/262) If runtime is v2, it may be aborted with an error when attaching

* `1.11.0` - 2022-02-11
    * Added: [#201](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/201) Add `useLoadedScripts` to launch.json
    * Fixed: [#189](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/189) Refix. Stopping the debugger adapter due to ECONNRESET error
    * Fixed: [#198](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/198) The error message when ECONNRESET occurs is incorrect
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) Loaded Scripts process may become extremely slow. broken by `1.10.0`
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) Debugging will not start if scripts are included that are loaded into each other using `#Include`
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) [The standard library](https://www.autohotkey.com/docs/Functions.htm#lib) may not be displayed in Loaded scripts, and the debugger directive may not work
    * Fixed: [#202](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/202) Error message is not displayed when a non-existent runtime is specified
    * Fixed: [#203](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/203) If the number of loaded scripts exceeds 60, only the first debug will fail
    * Fixed: [#204](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/204) [AutoHotkey v2-128](https://www.autohotkey.com/boards/viewtopic.php?f=37&t=2120&sid=e7d43fe09e912b95ab2d1747a47f8bad&start=80#p385995) and later versions may show auto-include-libraries in Loaded Scripts that are not actually loaded
    * Fixed: [#205](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/205) When a library call is included in a string or in a comment, files that are not actually loaded may appear in the Loaded Scripts

* `1.10.2` - 2022-01-27
    * Fixed: [#192](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/192) Debug adapter may crash when evaluating variables in hover, watch expressions, etc.

* **[YANKED]** `1.10.1` - 2022-01-26
    * Fixed: [#179](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/179) `Run Without Debugging` does not print any output to the debug console
    * Fixed: [#180](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/180) Hit conditional breakpoint do not work properly if they contain spaces before or after the condition
    * Fixed: [#188](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/188) ComObject child elements may not be displayed correctly in data inspection, watch expression, etc.
    * Fixed: [#188](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/188) 4 errors may occur when displaying ComObject child elements in data inspection
    * Fixed: [#189](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/189) Stopping the debugger adapter due to ECONNRESET error

See [CHANGELOG](CHANGELOG.md) for details.

# Installation
1. Install [VSCode](https://code.visualstudio.com/) with version `1.49.0` or higher
2. Install [AutoHotkey](https://www.autohotkey.com/)
3. **Install an another extension to support AutoHotkey** (the famous [slevesque.vscode-autohotkey](https://marketplace.visualstudio.com/items?itemName=slevesque.vscode-autohotkey), If you use v2, use [dudelmoser.vscode-autohotkey2](https://marketplace.visualstudio.com/items?itemName=dudelmoser.vscode-autohotkey2), etc.)
4. Open VSCode, press `Ctrl + P` then type `ext install zero-plusplus.vscode-autohotkey-debug`

## For advanced users
This extension will work without configuration as long as you follow the steps above.

However, if you want to use a different version of AutoHotkey for which no installer is provided, you will need to configure it separately.

By default, the runtime is configured for each file extension as shown below, so please place the runtime in the same path.
* `ahk` - `C:/Program Files/AutoHotkey/AutoHotkey.exe`
* `ahk2` or `ah2` - `C:/Program Files/AutoHotkey/v2/AutoHotkey.exe`

If you want to place the runtime in a specified folder, you need to set the [runtime](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Launch-Mode) attribute in launch.json.

# Usage
1. Open a file with the extension `ahk`, `ahk2` or `ah2`.
2. (optional) Set [Breakpoint](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Breakpoint) where you want them
3. Press `F5`

If you want to enable more advanced features and make more detailed settings, please refer to [Debug configurations](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Debug-configurations).

If you need to run the script without debugging, choose `Run -> Run Without Debugging` from the menu or press `Ctrl + F5`.

For more information on how to use many of the other features, see [here](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki).

# Contributes
I am currently not accepting source code contributions (i.e. Pull Request). Instead, you can report bugs and request features in Issues.

I usually reply by the next day.

# Development support
You can support development with [donate or sponsor](https://github.com/sponsors/zero-plusplus) (Github account required).

**Please note, that I have not setup a reward, as I am dedicated to development.**