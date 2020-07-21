+++
title = "Skyrim"
template = "content.html"
date = 2020-07-21
+++

## Skyrim Mods

This is my Skyrim modlist, presented as is. I use it as a base for Skyrim modding, and I'm sharing
it here in case it's useful to others. It may or may not be up to date and installable; no
guarantees or support are offered in this regard.

### Download

Download: (Bodilrim.wabbajack)[Bodilrim.wabbajack]

### Installation

Start with a _clean, unmodified_ Skyrim SE installation. Get [Wabbajack](https://www.wabbajack.org/)
and feed the modlist to it. Once done, the output folder will contain a portable Mod Organizer 2
installation with everything you need to run and further mod Skyrim.

The only required step after Wabbajack has done its work is to copy the contents of the
`Game Folder Files` folder into your Skyrim SE installation directory, next to the `SkyrimSE.exe`
file.

### Optional Steps

#### Review Installed Mods

This modlist's primary focus is on visuals, but it adds some gameplay content too. Review the mods
under the **Gameplay** and **Content** sections near the top and the **SkyRe** section at the end,
and decide which you want to keep. It's safe to disable all of them without compromising the rest of
the modlist.

You can also pick another main menu replacer from the three provided, or disable them altogether for
the original Skyrim main menu experience.

You should run _zEdit_ afterwards to regenerate the three patch ESPs (`zPatch.esp`,
`ENBLight Patch.esp` and `ReProccer.esp`) for your changed content. If you've disabled _SkyRe_, you
should not generate `ReProccer.esp` in _zEdit_, and you should also disable it in your MO2 plugin
list. The other two are needed by the visual mods, and `zPatch.esp` is also needed by you, as, among
other things, it patches helmets to show Khajiit ears through them.

Once this is done, go through the plugin list in the MO2 interface and disable any plugins that now
have missing masters, these are patches you no longer need for the content you've disabled.

#### Generate LOD Files

Generated LOD files are not included, but all the tools you need to generate them are. It's
recommended that you do so, or your distant terrain is going to look less than optimal. I won't
detail the process here, find a tutorial on xLODGen and DynDOLOD if you need assistance. You can
launch all the tools through MO2, and there are three empty mods at the end of the list named
**Default xLODGen Output**, **Default TexGen Output** and **Default DynDOLOD Output** ready for you
to drop your generated files into.

#### Tweak Your ENB

You'll have the "Full Quality" version of
[Natural View Tamriel ENB](https://www.nexusmods.com/skyrimspecialedition/mods/11203) set up for
you. You may wish to instead use the "Performance" version, if your GPU isn't keeping up. Download
the Cathedral Weathers variant, extract and copy over the relevant files to your Skyrim game folder.

### Launching the Game

Launch the game by opening MO2 and running SKSE through it.
