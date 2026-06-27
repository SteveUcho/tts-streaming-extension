declare global {
    var AudioPlayer: typeof import('./popup/audioPlayer').AudioPlayer; 
    var audioPlayer: InstanceType<typeof import('./popup/audioPlayer').AudioPlayer>;
}

export { };