interface Props {
  url: string;
  mimeType?: string;
}

export default function VideoPlayer({ url, mimeType }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
      }}
    >
      <video
        controls
        autoPlay={false}
        preload="metadata"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        playsInline
      >
        <source src={url} type={mimeType || 'video/mp4'} />
        Your browser does not support video playback.
        <a href={url} download style={{ color: 'var(--color-accent)' }}>
          Download video
        </a>
      </video>
    </div>
  );
}
