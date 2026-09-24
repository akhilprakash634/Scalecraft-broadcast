import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Limit file size to 50MB (zip/pdf can be large)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Ensure the bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) {
      console.error('Error listing storage buckets:', listError.message);
    } else {
      const exists = buckets.some(b => b.name === 'product-media');
      if (!exists) {
        const { error: createError } = await supabaseAdmin.storage.createBucket('product-media', {
          public: true,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: [
            'image/png', 
            'image/jpeg', 
            'image/gif', 
            'image/webp', 
            'application/pdf', 
            'application/zip', 
            'application/x-zip-compressed',
            'application/octet-stream'
          ]
        });
        if (createError) {
          console.error('Error creating storage bucket:', createError.message);
        }
      }
    }

    // 2. Generate a secure unique filename under admin namespace
    const fileExt = file.name.split('.').pop() || 'png';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `admin/${Date.now()}_${cleanFileName}.${fileExt}`;

    // 3. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-media')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('product-media')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
    });
  } catch (error: any) {
    console.error('Admin File Upload Error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
