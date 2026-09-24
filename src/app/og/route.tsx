import { ImageResponse } from 'next/og';
 
export const runtime = 'edge';
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'ScaleCraft';
  const subtitle = searchParams.get('subtitle') || 'AI Systems for Indian Freelancers';
 
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#111110',
          padding: '80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#0055FF',
              borderRadius: '8px',
              marginRight: '15px',
            }}
          />
          <div
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: 'white',
              letterSpacing: '-1px',
            }}
          >
            ScaleCraft
          </div>
        </div>
        <div
          style={{
            fontSize: '64px',
            fontWeight: '900',
            color: 'white',
            lineHeight: '1.1',
            letterSpacing: '-2px',
            marginBottom: '20px',
            maxWidth: '900px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.6)',
            lineHeight: '1.4',
            maxWidth: '700px',
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
