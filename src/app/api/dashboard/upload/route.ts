import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const userClient = await getSessionClient();
    if (!userClient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucketName = searchParams.get('bucket') || 'product-images';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Limit file size to 30MB
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 30MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Ensure the bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing storage buckets:', listError.message);
    } else {
      const exists = buckets.some(b => b.name === bucketName);
      if (!exists) {
        const bucketOptions: any = {
          public: true,
          fileSizeLimit: 31457280, // 30MB
        };
        if (bucketName === 'product-images') {
          bucketOptions.allowedMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
        }
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, bucketOptions);
        if (createError) {
          console.error(`Error creating storage bucket '${bucketName}':`, createError.message);
        }
      }
    }

    // 2. Generate a secure unique filename under the client's namespace (UUID is non-enumerable)
    const clientId = userClient.id || userClient._id;
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${clientId}/${Date.now()}_${cleanFileName}.${fileExt}`;

    // 3. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error: any) {
    console.error('File Upload Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
