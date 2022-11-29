plugin.Name = "Plugin";
plugin.OnChangeRequest = onChangeRequest;
plugin.OnConnect = onConnect;
plugin.OnDisconnect = onDisconnect;
plugin.OnPoll = onPoll;
plugin.OnSynchronizeDevices = onSynchronizeDevices;
plugin.PollingInterval = 1000;
// plugin.PollingInterval = 10000;
plugin.DefaultSettings = {"Host": "192.168.1.194", "Port": "80"};

var http = new HTTPClient();
var apiUrl;

function onChangeRequest(device, attribute, value) {
    console.log("ATR : " + attribute);
    console.log("VAL : " + value);

    switch (attribute) {
        case "PlaybackStatus" : {
            device.SupportedMediaCommands = removeItemAll(device.SupportedMediaCommands, value)

            for (let i = 0; i < device.SupportedMediaCommands.length; i++) {
                console.log("[" + i + "]" + device.SupportedMediaCommands[i])
            }

            switch (value) {
                case "Play": {
                    http.get(apiUrl + "command=setPlayerCmd:play");
                    device.SupportedMediaCommands = ["Pause"].concat(device.SupportedMediaCommands);
                    break;
                }
                case "Pause" : {
                    http.get(apiUrl + "command=setPlayerCmd:pause");
                    device.SupportedMediaCommands = ["Play"].concat(device.SupportedMediaCommands);
                    break;
                }
                case "Stop": {
                    http.get(apiUrl + "command=setPlayerCmd:stop");
                    device.SupportedMediaCommands = ["Play"].concat(device.SupportedMediaCommands);
                    break;
                }
                default : {
                    throw "Unsupported attribute"
                }
            }
            device.PlaybackStatus = value;
            break;
        }
        case "MediaCommand" : {
            switch (value) {
                case "SkipForward" :
                    http.get(apiUrl + "command=setPlayerCmd:next");
                    break;
                case "SkipBackward":
                    http.get(apiUrl + "command=setPlayerCmd:prev");
                    break;
                default : {
                    throw "Invalid attribute"
                }
            }
            device.PlaybackShuffle = value;
            break;
        }
        case "PlaybackShuffle" : {
            switch (value) {
                case "Enabled" :
                    http.get(apiUrl + "command=setPlayerCmd:loopmode:2");
                    device.SupportedMediaCommands = ["ShuffleOff"].concat(device.SupportedMediaCommands);
                    break;
                case "Disabled":
                    http.get(apiUrl + "command=setPlayerCmd:loopmode:0");
                    device.SupportedMediaCommands = ["ShuffleOn"].concat(device.SupportedMediaCommands);
                    break;
                default : {
                    throw "Invalid attribute"
                }
            }
            device.PlaybackShuffle = value;
            break;
        }
        case "PlaybackRepeatMode" : {
            switch (value) {
                case "All" :
                    http.get(apiUrl + "command=setPlayerCmd:loopmode:1");
                    break;
                case "Off":
                    http.get(apiUrl + "command=setPlayerCmd:loopmode:0");
                    break;
                case "One":
                    http.get(apiUrl + "command=setPlayerCmd:loopmode:-1");
                    break;
                default : {
                    throw "Invalid attribute"
                }
            }
            device.PlaybackRepeatMode = value;
            break;
        }
        case "Mute":
            if (value === "Muted") {
                if (device.Mute === "1") {
                    if (device.Volume > 0) {
                        http.get(apiUrl + "command=setPlayerCmd:vol:" + device.Volume);
                        device.Mute = "0";
                    } else {
                        http.get(apiUrl + "command=setPlayerCmd:vol:" + 15);
                        device.Volume = "15";
                    }
                } else {
                    http.get(apiUrl + "command=setPlayerCmd:mute:1");
                    device.Mute = "1";
                }
            }
            break;
        case "Volume": {
            if (value < 0) {
                throw "Invalid value";
            } else {
                device.Volume = value;
                http.get(apiUrl + "command=setPlayerCmd:vol:" + value);
            }
            break;
        }
        case "InputSource" : {
            http.get(apiUrl + "command=setPlayerCmd:playLocalList:" + value);
            break;
        }
        case "CurPosition" : {
            throw "Unsupported action"
        }
        case "Switch":
            device.Switch = value;
            break;
        default:
            throw "Unsupported action"
    }

}

function onConnect() {
    apiUrl = "http://" + plugin.Settings["Host"] + ":" + plugin.Settings["Port"] + "/httpapi.asp?";
}

function onDisconnect() {
    console.log("disconnected");
}

function onPoll() {
    var r = http.get(apiUrl + "command=getPlayerStatus");

    var device = plugin.Devices["MP1"];
    device.SupportedSoundModes = ["None", "Classic", "Popular", "Jazzy", "Vocal"]

    if (device) {
        device.Chanel = r.data.ch
        device.Mode = r.data.mode
        device.Volume = r.data.vol
        device.Mute = r.data.mute
        device.Artist = hex_to_ascii(r.data.Artist)
        device.Album = hex_to_ascii(r.data.Album)
        device.Title = hex_to_ascii(r.data.Title)
        device.CurPosition = ms2MinStr(r.data.curpos)
        device.TotalLength = ms2MinStr(r.data.totlen)

        device.SupportedMediaCommands = [];
        switch (r.data.status) {
            case "stop" : {
                device.PlaybackStatus = "Stop";
                device.SupportedMediaCommands = ["Play"].concat(device.SupportedMediaCommands);
                break;
            }
            case "pause" : {
                device.PlaybackStatus = "Pause";
                device.SupportedMediaCommands = ["Play"].concat(device.SupportedMediaCommands);
                break;
            }
            case "play" : {
                device.PlaybackStatus = "Play";
                device.SupportedMediaCommands = ["Pause"].concat(device.SupportedMediaCommands);
                break;
            }
        }

        switch (r.data.loop) {
            case "0" : {
                device.PlaybackShuffle = "Disabled"
                device.PlaybackRepeatMode = "Off"
                device.SupportedMediaCommands = ["ShuffleOn"].concat(device.SupportedMediaCommands);
                break;
            }
            case "1" : {
                device.PlaybackRepeatMode = "All"
                device.SupportedMediaCommands = ["ShuffleOn"].concat(device.SupportedMediaCommands);
                break;
            }
            case "2" : {
                device.PlaybackShuffle = "Enabled"
                device.SupportedMediaCommands = ["ShuffleOn"].concat(device.SupportedMediaCommands);
                break;
            }
            case "-1" : {
                device.PlaybackRepeatMode = "One"
                device.SupportedMediaCommands = ["ShuffleOn"].concat(device.SupportedMediaCommands);
                break;
            }
        }

        switch (r.data.eq) {
            case "0" : {
                device.SoundMode = "None";
                break;
            }
            case "1" : {
                device.SoundMode = "Classic mode";
                break;
            }
            case "2" : {
                device.SoundMode = "Popular mode";
                break;
            }
            case "3" : {
                device.SoundMode = "Jazzy mode";
                break;
            }
            case "4" : {
                device.SoundMode = "Vocal mode";
                break;
            }


        }

        if (device.SupportedMediaCommands.length === 0) {
            device.SupportedMediaCommands = ["Play", "RepeatOff", "ShuffleOn"];
        }
    }

    var fileListResponse = http.get(apiUrl + "command=getLocalPlayList");
    device.PlaylistTitle = fileListResponse.data.num;
    var fileList = fileListResponse.data.locallist;

    /*var range = fileList.length;

    var playListResponse = http.get(apiUrl + "command=getFileInfo:0:" + range);
    var playList = playListResponse.data.infolist;

    if (playList.length > 1) {
        device.SupportedInputSources = [];
        for (var i = 0; i < playList.length; i++) {
            var track = {
                id: i,
                filename : hex_to_ascii(playList[i].filename),
                filename : hex_to_ascii(playList[i].filename),
            }
        }
    }*/

    if (fileList.length > 1) {
        device.PlaylistTitle = fileListResponse.data.num;
        device.SupportedInputSources = [];
        for (var i = 0; i < fileList.length; i++) {
            var name = hex_to_ascii(fileList[i].file);
            var track = {id: i, name: name}
            device.SupportedInputSources = [track].concat(device.SupportedInputSources);
        }
    }

}

function onSynchronizeDevices() {
    var device = new Device();
    device.Id = "MP1";
    device.Name = "IEAST";
    device.DisplayName = "IEAST";
    device.Capabilities = ["Switch", "AudioBass", "AudioMute", "AudioSoundMode", "AudioTrackData", "AudioTrackData.Album", "AudioTreble", "AudioVolume", "AudioVolumeDecibel", "MediaControl", "MediaGroup", "MediaInputSource", "MediaPlaybackRepeat", "MediaPlaybackShuffle", "MediaPlayback", "MediaPlaybackTime"];
    device.Attributes = ["Title", "Artist", "Album", "TotalLength", "CurPosition", "PlaylistTitle", "Playlist"];
    device.Switch = "On";

    plugin.Devices[device.Id] = device;
}

function hex_to_ascii(hexVal) {
    var hex = hexVal.toString();
    var str = '';
    for (var n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}

function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
        if (arr[i] === value) {
            arr.splice(i, 1);
        } else {
            ++i;
        }
    }
    return arr;
}

function ms2MinStr(ms) {
    ms = ms.trim();
    var min = new Date(+ms).getMinutes().toString();
    if (min.length < 2)
        min = "0" + min;
    var sec = new Date(+ms).getSeconds().toString();
    if (sec.length < 2)
        sec = "0" + sec;
    return min + ":" + sec;
}

function time2ms(time) {
    var timeArr = time.toString().split(":");
    var min = +timeArr[0];
    var sec = +timeArr[1];
    return min * 60 * 1000 + sec * 1000;
}

