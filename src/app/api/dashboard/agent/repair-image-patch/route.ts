import { NextResponse } from 'next/server';
import { getSessionClient } from '@/lib/auth';
import { executeCommand, uploadFile, restartAgent, getClientServerIp } from '@/lib/ssh';

// The Python patch script - re-applies image rendering fixes to
// whatsapp.py (send_image signature) and base.py (extract_images method).
// This must be re-run whenever Hermes auto-updates overwrite these files.
const PATCH_SCRIPT = `
import os, re

def patch_whatsapp():
    paths = [
        os.path.expanduser('~/.hermes/hermes-agent/gateway/platforms/whatsapp.py'),
        os.path.expanduser('~/.hermes/hermes-agent/agent/whatsapp.py'),
    ]
    filepath = next((p for p in paths if os.path.exists(p)), None)
    if not filepath:
        print("WARN: whatsapp.py not found at any known path")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The old signature (missing metadata and **kwargs)
    old_target = '''    async def send_image(
        self,
        chat_id: str,
        image_url: str,
        caption: Optional[str] = None,
        reply_to: Optional[str] = None,
    ) -> SendResult:
        """Download image URL to cache, send natively via bridge."""
        try:
            local_path = await cache_image_from_url(image_url)
            return await self._send_media_to_bridge(chat_id, local_path, "image", caption)
        except Exception:
            return await super().send_image(chat_id, image_url, caption, reply_to)'''

    new_target = '''    async def send_image(
        self,
        chat_id: str,
        image_url: str,
        caption: Optional[str] = None,
        reply_to: Optional[str] = None,
        metadata=None,
        **kwargs,
    ) -> SendResult:
        """Download image URL to cache, send natively via bridge."""
        try:
            local_path = await cache_image_from_url(image_url)
            return await self._send_media_to_bridge(chat_id, local_path, "image", caption)
        except Exception:
            return await super().send_image(chat_id, image_url, caption, reply_to, metadata=metadata, **kwargs)'''

    if new_target in content:
        print("OK: whatsapp.py already patched")
    elif old_target in content:
        content = content.replace(old_target, new_target)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("PATCHED: whatsapp.py send_image signature updated")
    else:
        print("WARN: whatsapp.py send_image block not found (may be a newer Hermes version)")


def patch_whatsapp_send():
    paths = [
        os.path.expanduser('~/.hermes/hermes-agent/gateway/platforms/whatsapp.py'),
        os.path.expanduser('~/.hermes/hermes-agent/agent/whatsapp.py'),
    ]
    filepath = next((p for p in paths if os.path.exists(p)), None)
    if not filepath:
        print("WARN: whatsapp.py not found at any known path")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "re.search(r'\\\\[[^\\\\]]*(?:silent|silence|ignore|handoff)[^\\\\]]*\\\\]'" in content:
        print("OK: whatsapp.py send method already patched with anti-loop filter")
        return

    target_pattern = r'(async def send\\([\\s\\S]*?-> SendResult:)'

    if not re.search(target_pattern, content):
        print("WARN: whatsapp.py send method not found")
        return

    patch = """
        # Anti-Loop Silence Protection
        import re as _re
        if content and _re.search(r'\\\\[[^\\\\]]*(?:silent|silence|ignore|handoff)[^\\\\]]*\\\\]', content, _re.IGNORECASE):
            print(f"[Anti-Loop] Blocking bracketed silence/ignore text: {content}")
            return SendResult(success=True)
"""

    patched_content = re.sub(target_pattern, lambda m: m.group(1) + patch, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(patched_content)
    print("PATCHED: whatsapp.py send method updated with anti-loop silent filter")


def patch_base_extract_images():
    filepath = os.path.expanduser('~/.hermes/hermes-agent/gateway/platforms/base.py')
    if not os.path.exists(filepath):
        print("WARN: base.py not found")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already patched with our CDN domain list
    if "cdn.sanity.io" in content and "fal.media" in content:
        print("OK: base.py extract_images already patched")
        return

    # Pattern to find the extract_images method up to send_voice
    target_pattern = r'(    @staticmethod\\s+def extract_images\\([\\s\\S]*?)(    async def send_voice\\()'

    if not re.search(target_pattern, content):
        print("WARN: base.py extract_images pattern not found (may be a newer Hermes version)")
        return

    new_extract_images = '''    @staticmethod
    def extract_images(content: str):
        """
        Extract image URLs from markdown, links, HTML img tags, and raw CDN URLs.
        Supports: Sanity CDN, fal.media, unsplash, and any .png/.jpg/.jpeg/.gif/.webp URLs.
        """
        import re as _re
        images = []
        cleaned = content

        def is_image(url_str, match_text=''):
            if 'media:' in match_text.lower():
                return True
            url_lower = url_str.lower()
            known_domains = [
                'fal.media', 'fal-cdn', 'replicate.delivery',
                'cdn.sanity.io', 'sanity.io/images',
                'images.unsplash.com', 'unsplash.com',
            ]
            if any(d in url_lower for d in known_domains):
                return True
            path_part = url_lower.split('?')[0].split('#')[0]
            return any(path_part.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp'])

        # ![alt](url)
        md_img = r'!\\\\[([^\\\\]]*)\\\\]\\\\((https?://[^\\\\s\\\\)]+)\\\\)'
        for m in _re.finditer(md_img, content):
            url = m.group(2)
            if is_image(url, m.group(0)):
                images.append((url, m.group(1)))

        # [alt](url) - not preceded by !
        md_link = r'(?<!\\\\!)\\\\[([^\\\\]]*)\\\\]\\\\((https?://[^\\\\s\\\\)]+)\\\\)'
        for m in _re.finditer(md_link, content):
            url = m.group(2)
            if is_image(url, m.group(0)):
                images.append((url, m.group(1)))

        # <img src="url">
        html_img = r'<img\\\\s+src=["\\\\'\\\\']?(https?://[^\\\\s"\\\\'\\\\']+)["\\\\'\\\\']?\\\\s*/?>'
        for m in _re.finditer(html_img, content, _re.IGNORECASE):
            images.append((m.group(1), ''))

        # Raw CDN URLs
        raw_url = r'(https?://[^\\\\s\\\\)\\\\]\\\\],"\\\\'\\\\'>]+)'
        seen = {u for u, _ in images}
        for m in _re.finditer(raw_url, content):
            url = m.group(1).rstrip('.,;!?')
            if url not in seen and is_image(url, m.group(0)):
                images.append((url, ''))
                seen.add(url)

        # Clean matched URLs from content
        if images:
            ext = {u for u, _ in images}

            def _rm(m):
                u = m.group(len(m.groups())).rstrip('.,;!?')
                return '' if u in ext else m.group(0)

            cleaned = _re.sub(md_img, _rm, cleaned)
            cleaned = _re.sub(md_link, _rm, cleaned)
            cleaned = _re.sub(html_img, _rm, cleaned)
            cleaned = _re.sub(raw_url, _rm, cleaned)
            cleaned = _re.sub(r'\\\\n{3,}', '\\\\n\\\\n', cleaned).strip()

        return images, cleaned

    async def send_voice('''

    patched = re.sub(target_pattern, lambda m: new_extract_images, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(patched)
    print("PATCHED: base.py extract_images updated with CDN image support")


def patch_session():
    filepath = os.path.expanduser('~/.hermes/hermes-agent/gateway/session.py')
    if not os.path.exists(filepath):
        print("WARN: session.py not found")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_ensure = """    def _ensure_loaded_locked(self) -> None:
        \"\"\"Load sessions index from disk. Must be called with self._lock held.\"\"\"
        if self._loaded:
            return"""

    new_ensure = """    def _ensure_loaded_locked(self, force: bool = False) -> None:
        \"\"\"Load sessions index from disk. Must be called with self._lock held.\"\"\"
        if self._loaded and not force:
            return"""

    old_get_create = """        with self._lock:
            self._ensure_loaded_locked()

            if session_key in self._entries and not force_new:"""

    new_get_create = """        with self._lock:
            self._ensure_loaded_locked()
            if session_key not in self._entries:
                self._ensure_loaded_locked(force=True)

            if session_key in self._entries and not force_new:"""

    if new_ensure in content and new_get_create in content:
        print("OK: session.py already patched")
        return
    if old_ensure not in content or old_get_create not in content:
        print("WARN: session.py target blocks not found")
        return

    content = content.replace(old_ensure, new_ensure).replace(old_get_create, new_get_create)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("PATCHED: session.py reload logic updated")


patch_whatsapp()
patch_whatsapp_send()
patch_base_extract_images()
patch_session()
print("DONE")
`;

export async function POST() {
    try {
        const client = await getSessionClient();
        if (!client) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const serverIP = getClientServerIp(client);
        const { sshPrivateKey, serverUser } = client;
        if (!serverIP || !sshPrivateKey) {
            return NextResponse.json({ error: 'Server details missing' }, { status: 400 });
        }

        const user = serverUser || 'ubuntu';

        // Upload patch script to server
        const scriptPath = `/home/ubuntu/.hermes/repair_image_patch_${client._id}.py`;
        const uploaded = await uploadFile(serverIP, sshPrivateKey, PATCH_SCRIPT, scriptPath, user);
        if (!uploaded) {
            return NextResponse.json({ error: 'Failed to upload patch script to server' }, { status: 500 });
        }

        // Run it
        const result = await executeCommand(
            serverIP, sshPrivateKey,
            `python3 ${scriptPath} && rm -f ${scriptPath}`,
            user
        );

        const output = (result.stdout || '') + (result.stderr || '');
        const success = output.includes('DONE');

        if (!success) {
            console.error('[repair-image-patch] Patch output:', output);
            return NextResponse.json({
                error: 'Patch script did not complete successfully',
                output,
            }, { status: 500 });
        }

        // Restart agent so changes take effect
        await restartAgent(client, sshPrivateKey, user);

        return NextResponse.json({
            success: true,
            message: 'Image rendering patches applied and agent restarted.',
            output: output.trim(),
        });
    } catch (error: any) {
        console.error('[repair-image-patch] Error:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
