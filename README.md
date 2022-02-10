**Translated by [DeepL Tranlator](https://www.deepl.com/translator)**

# Overview
This extension is a debugger adapter for [VSCode](https://code.visualstudio.com/) that provides many [advanced features](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki/Features) in addition to the basic debugging features.

# News
## Important Notices
* There have been major changes in `1.10.0` and some fatal bugs have been found. If you encounter problems, please update to the latest version or downgrade to `1.9.0`. Also, if you report it on [GitHub](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues), I will reply the same day or the next day

* The required version of VSCode has been raised from [1.45.0](https://code.visualstudio.com/updates/v1_45) to [1.49.0](https://code.visualstudio.com/updates/v1_49). Regardless, it is recommended that you install the latest version as some functions may not work

* Much of the README content has been migrated to the [Github wiki](https://github.com/zero-plusplus/vscode-autohotkey-debug/wiki). If you want to see the description of each feature, please refer to there

## Update
* `1.11.0` - 2022-xx-xx
    * Added: [#201](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/201) Add `useLoadedScripts` to launch.json
    * Changed: [AutoHotkey v2-128](https://www.autohotkey.com/boards/viewtopic.php?f=37&t=2120&sid=e7d43fe09e912b95ab2d1747a47f8bad&start=80#p385995) and later no longer performs auto-include libraries detection. This will speed up the initialization time for debugging in the affected version
    * Changed: Improved detection of auto-include libraries to reduce the occurrence of wrong detections
    * Fixed: [#189](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/189) Refix. Stopping the debugger adapter due to ECONNRESET error
    * Fixed: [#198](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/198) The error message when ECONNRESET occurs is incorrect
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) Loaded Scripts process may become extremely slow. broken by `1.10.0`
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) Debugging will not start if scripts are included that are loaded into each other using `#Include`
    * Fixed: [#199](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/199) [The standard library](https://www.autohotkey.com/docs/Functions.htm#lib) may not be displayed in Loaded scripts, and the debugger directive may not work
    * Fixed: [#202](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/202) Error message is not displayed when a non-existent runtime is specified
    * Fixed: [#203](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/203) If the number of loaded scripts exceeds 60, only the first debug will fail

* `1.10.2` - 2022-01-27
    * Fixed: [#192](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/192) Debug adapter may crash when evaluating variables in hover, watch expressions, etc.

* **[YANKED]** `1.10.1` - 2022-01-26
    * Fixed: [#179](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/179) `Run Without Debugging` does not print any output to the debug console
    * Fixed: [#180](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/180) Hit conditional breakpoint do not work properly if they contain spaces before or after the condition
    * Fixed: [#188](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/188) ComObject child elements may not be displayed correctly in data inspection, watch expression, etc.
    * Fixed: [#188](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/188) 4 errors may occur when displaying ComObject child elements in data inspection
    * Fixed: [#189](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/189) Stopping the debugger adapter due to ECONNRESET error


* `1.10.0` - 2021-12-25
    * Added: [#75](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/75) Add some context menus to copy the value of a variable in data inspection
    * Added: [#88](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/88) Add `variableCategories` attribute to launch.json
    * Added: [#142](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/142) Add `useAnnounce` attribute to launch.json
    * Added: [#142](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/142) Add `useOutputDebug` attribute to launch.json
    * Added: [#147](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/147) Add ClearConsole directive to debug directive
    * Added: [#148](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/148) Add `Add to Watch` and `Copy as Expression` to context menu of data inspection
    * Added: [#150](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/150) Add `{now}`, `{callstack}`, `{callstackNames}`, `{thisCallstack}` to meta variables
    * Added: [#151](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/151) Add `{variablesCategories}` to meta variables
    * Added: [#154](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/154) Add some context menus to view the value of a variable in data inspection
    * Added: [#161](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/161) Add `has` operator to conditional breakpoint
    * Added: [#162](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/162) Add `contanis` operator to conditional breakpoint
    * Added: [#173](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/173) Add `cwd` attribute to launch.json
    * Added: Add a some snippet to launch.json
    * Changed: [#157](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/157) The specification has been changed so that when multiple objects are output at log points, etc., they are grouped together and only one message is output
    * Changed: [#163](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/163) Restored true base objects to `<base>` notation
    * Changed: [#165](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/165) The hover information has been improved so that it can display the value of properties that contain bracket notation such as `var[key].property`
    * Changed: [#176](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/176) Add a new format to log points, etc., to specify the depth of the child elements to retrieve, such as `{variableName:depth}`
    * Changed: Change so that [numerical variables](https://www.autohotkey.com/docs/Variables.htm#CommandLine) representing  command line arguments are not suggested by IntelliSense
    * Fixed: [#149](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/149) Watch expression only show the contents of the latest call stack
    * Fixed: [#164](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/164) Fix inefficient debugging command call process
    * Fixed: [#167](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/167) `0x0` is not treated as falsy in conditional breakpoint
    * Fixed: [#168](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/168) When a string is specified as bracket notation in a conditional breakpoint, it is not evaluated correctly
    * Fixed: [#169](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/169) When a `true` is specifed in a conditional breakpoint, if it contains capital letters, it will not be evaluated correctly
    * Fixed: [#170](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/170) If the script exits after using a conditional breakpoint that returns false, an error ECONNRESET may occur
    * Fixed: [#171](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/171) Cannot correctly retrieve children of object with key containing linebreak
    * Fixed: [#177](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/177) Whenever a conditional breakpoint contains a space in front of the condition, it is evaluated as `false`
    * Fixed: [#178](https://github.com/zero-plusplus/vscode-autohotkey-debug/issues/178) v2 only bug. Bracket notation suggestion displays properties that are not actually available
    * Fixed: When `"attach"` is specified for request when editing launch.json, `skipFiles` and `skipFunctions` are not displayed in the IntelliSense
    * Fixed: The breakpoint operation may fail

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