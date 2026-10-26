// Curated app catalogue. webOS 6 denies listing installed apps to web apps, so the launcher knows these IDs
// (US app IDs from an LG webOS 6 TV) and shows only the installed ones. Cards use brand colours, with a logo
// from js/logos.js where one exists and the app's name as text otherwise.
(function (D) {
  var LIST = [
    { id: 'youtube.leanback.v4', name: 'YouTube', wm: 'YouTube', bg: 'linear-gradient(135deg,#ffffff,#e4e5ea)', fg: '#e00', fw: 800, ls: '-1px', fs: 56 },
    { id: 'netflix', name: 'Netflix', wm: 'NETFLIX', bg: 'linear-gradient(135deg,#2c2c2c,#0b0b0b)', fg: '#e50914', fw: 800, ls: '3px', fs: 48 },
    { id: 'com.disney.disneyplus-prod', name: 'Disney+', wm: 'Disney+', bg: 'linear-gradient(135deg,#2f55b0,#0b1a4a)', fg: '#fff', fw: 700, ls: '0', fs: 56 },
    { id: 'hulu', name: 'Hulu', wm: 'hulu', bg: 'linear-gradient(135deg,#232830,#0a0c0f)', fg: '#1ce783', fw: 800, ls: '-2px', fs: 72 },
    { id: 'com.wbd.stream', name: 'HBO Max', wm: 'HBO Max', bg: 'linear-gradient(135deg,#4343e0,#15156b)', fg: '#fff', fw: 800, ls: '-1px', fs: 56 },
    { id: 'com.peacock.tv', name: 'Peacock', wm: 'peacock', bg: 'linear-gradient(135deg,#ffffff,#e4e5ea)', fg: '#111', fw: 700, ls: '0', fs: 52 },
    { id: 'amazon', name: 'Prime Video', wm: 'prime video', bg: 'linear-gradient(135deg,#1fa2ff,#0a3f78)', fg: '#fff', fw: 700, ls: '0', fs: 48 },
    { id: 'com.apple.appletv', name: 'Apple TV', wm: 'Apple TV', bg: 'linear-gradient(135deg,#2b2b2e,#000)', fg: '#fff', fw: 600, ls: '0', fs: 46 },
    { id: 'com.movenetworks.app.sling-tv-sling-production', name: 'Sling TV', wm: 'sling', bg: 'linear-gradient(135deg,#2394e8,#0a4a88)', fg: '#fff', fw: 800, ls: '-1px', fs: 56 },
    { id: 'com.plutotv.app', name: 'Pluto TV', wm: 'Pluto TV', bg: 'linear-gradient(135deg,#f8e44a,#c9a800)', fg: '#16161a', fw: 800, ls: '0', fs: 48 },
    { id: 'com.tubitv.ott.tubi', name: 'Tubi', wm: 'tubi', bg: 'linear-gradient(135deg,#8a2bff,#3a0a8a)', fg: '#fff', fw: 800, ls: '-1px', fs: 60 },
    { id: 'com.crunchyroll.webapp', name: 'Crunchyroll', wm: 'Crunchyroll', bg: 'linear-gradient(135deg,#ff7a1a,#b84000)', fg: '#fff', fw: 800, ls: '0', fs: 42 },
    { id: 'vudu', name: 'Fandango at Home', wm: 'Fandango at Home', bg: 'linear-gradient(135deg,#3d6ef0,#18287a)', fg: '#fff', fw: 700, ls: '0', fs: 34 },
    { id: 'com.lgtvod.us.app', name: 'LG Movies & TV', wm: 'LG Movies & TV', bg: 'linear-gradient(135deg,#c2185b,#5c0a2e)', fg: '#fff', fw: 700, ls: '0', fs: 36 },
    { id: 'com.webos.app.lgchannels', name: 'LG Channels', wm: 'LG Channels', bg: 'linear-gradient(135deg,#b3003a,#5c0020)', fg: '#fff', fw: 700, ls: '0', fs: 40 },
    { id: 'amazon.alexa.view', name: 'Amazon Alexa', wm: 'alexa', bg: 'linear-gradient(135deg,#19b8ec,#0a4f7a)', fg: '#fff', fw: 700, ls: '0', fs: 56 },
    { id: 'com.webos.app.mediadiscovery', name: 'Media Player', wm: 'Media Player', bg: 'linear-gradient(135deg,#5b6b7d,#262d38)', fg: '#fff', fw: 600, ls: '0', fs: 40 },
    { id: 'com.webos.app.homeconnect', name: 'Home Dashboard', wm: 'Home Dashboard', bg: 'linear-gradient(135deg,#3f7f8c,#173a42)', fg: '#fff', fw: 600, ls: '0', fs: 36 },
    { id: 'com.webos.app.roomconnect', name: 'Room to Room Share', wm: 'Room to Room', bg: 'linear-gradient(135deg,#4a7f5c,#1c3a26)', fg: '#fff', fw: 600, ls: '0', fs: 36 },
    { id: 'com.twin.app.audiochannel', name: 'LG Radio+', wm: 'LG Radio+', bg: 'linear-gradient(135deg,#e2445c,#6e1424)', fg: '#fff', fw: 700, ls: '0', fs: 42 },
    { id: 'com.twin.app.gamingportal', name: 'LG Gaming Portal', wm: 'Gaming Portal', bg: 'linear-gradient(135deg,#6a3fd8,#251060)', fg: '#fff', fw: 700, ls: '0', fs: 36 },
    { id: 'com.webos.app.sportsteamsettings', name: 'Sports Alert', wm: 'Sports Alert', bg: 'linear-gradient(135deg,#2e9e5b,#11472a)', fg: '#fff', fw: 700, ls: '0', fs: 40 },
    { id: 'epoxyaisports', name: 'LG Sports Playbook', wm: 'Sports Playbook', bg: 'linear-gradient(135deg,#1f8a70,#0b3b30)', fg: '#fff', fw: 700, ls: '0', fs: 34 },
    { id: 'com.webos.app.livepick-full', name: 'Who.Where.What?', wm: 'Who.Where.What?', bg: 'linear-gradient(135deg,#d06a2a,#5a2508)', fg: '#fff', fw: 700, ls: '0', fs: 34 },
    { id: 'com.volley.lgshell', name: 'Weekend Games', wm: 'Weekend Games', bg: 'linear-gradient(135deg,#f0a020,#8a4a00)', fg: '#fff', fw: 800, ls: '0', fs: 38 },
    { id: 'com.miniclip.eightballpool', name: '8 Ball Pool', wm: '8 Ball Pool', bg: 'linear-gradient(135deg,#2f7d32,#123815)', fg: '#fff', fw: 800, ls: '0', fs: 42 },
    { id: 'com.lgtravel.app', name: 'LG Travel+', wm: 'LG Travel+', bg: 'linear-gradient(135deg,#2a8fd4,#0c3f66)', fg: '#fff', fw: 700, ls: '0', fs: 42 },
    { id: 'webos.day', name: 'LG Streaming Week', wm: 'Streaming Week', bg: 'linear-gradient(135deg,#9c2a8a,#3e0d37)', fg: '#fff', fw: 700, ls: '0', fs: 34 },
    { id: 'com.lgshop.app', name: 'ShopTime', wm: 'ShopTime', bg: 'linear-gradient(135deg,#d9534f,#6a1c1a)', fg: '#fff', fw: 700, ls: '0', fs: 42 },
    // A website shortcut opens in LG's web browser. Give it any unique id starting with 'web.', for example:
    // { id: 'web.example', name: 'My Site', wm: 'My Site', web: 'https://example.com/', bg: 'linear-gradient(135deg,#3a1622,#0d0a10)', fg: '#fff', fw: 700, ls: '0', fs: 48 },
    { id: 'com.webos.app.browser', name: 'Web Browser', wm: 'Web Browser', bg: 'linear-gradient(135deg,#526074,#232a35)', fg: '#fff', fw: 600, ls: '0', fs: 40 },
    { id: 'com.webos.app.discovery', name: 'LG Content Store', wm: 'Content Store', bg: 'linear-gradient(135deg,#7650cc,#2c1c6c)', fg: '#fff', fw: 600, ls: '0', fs: 38 }
  ];
  var byId = {};
  LIST.forEach(function (a) { byId[a.id] = a; });

  D.catalog = {
    list: LIST,
    byId: byId,
    // the default Favourites row (shown only if installed)
    defaultFavs: ['youtube.leanback.v4', 'netflix', 'com.disney.disneyplus-prod', 'hulu', 'com.wbd.stream', 'com.peacock.tv', 'amazon']
  };
})(window.Dock);
