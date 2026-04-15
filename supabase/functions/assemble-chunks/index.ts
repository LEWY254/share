import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CHUNKS_BUCKET = "betadrop_chunks";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { upload_id } = await req.json();

    if (!upload_id) {
      return jsonResponse({ error: "upload_id is required" }, 400);
    }

    const sessionRes = await fetch(
      `${supabaseUrl}/rest/v1/betadrop_upload_sessions?upload_id=eq.${upload_id}&select=*`,
      {
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
          "Content-Type": "application/json",
        },
      }
    );

    const sessions = await sessionRes.json();
    if (!sessions || sessions.length === 0) {
      return jsonResponse({ error: "Upload session not found" }, 404);
    }

    const session = sessions[0];

    if (session.status === "completed") {
      return jsonResponse({ error: "Upload already completed", url: session.final_path }, 400);
    }

    await fetch(
      `${supabaseUrl}/rest/v1/betadrop_upload_sessions?upload_id=eq.${upload_id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "assembling" }),
      }
    );

    const chunkData: Uint8Array[] = [];
    let allChunksDownloaded = true;

    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `${upload_id}_chunk_${i}`;
      const chunkRes = await fetch(
        `${supabaseUrl}/storage/v1/object/${CHUNKS_BUCKET}/${chunkPath}`,
        {
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
        }
      );

      if (!chunkRes.ok) {
        allChunksDownloaded = false;
        break;
      }

      const chunkBuffer = await chunkRes.arrayBuffer();
      chunkData.push(new Uint8Array(chunkBuffer));
    }

    if (!allChunksDownloaded) {
      await fetch(
        `${supabaseUrl}/rest/v1/betadrop_upload_sessions?upload_id=eq.${upload_id}`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "failed" }),
        }
      );

      return jsonResponse({ error: "Missing chunks" }, 500);
    }

    const totalLength = chunkData.reduce((acc, chunk) => acc + chunk.length, 0);
    const assembledFile = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunkData) {
      assembledFile.set(chunk, offset);
      offset += chunk.length;
    }

    const finalPath = `${session.bucket_id}/${session.file_name}`;
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/${session.bucket_id}/${session.file_name}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
          "Content-Type": "application/octet-stream",
          "x-upsert": "true",
        },
        body: assembledFile,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return jsonResponse({ error: "Failed to upload assembled file", details: errText }, 500);
    }

    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `${upload_id}_chunk_${i}`;
      await fetch(
        `${supabaseUrl}/storage/v1/object/${CHUNKS_BUCKET}/${chunkPath}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "apikey": supabaseServiceKey,
          },
        }
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${session.bucket_id}/${session.file_name}`;

    await fetch(
      `${supabaseUrl}/rest/v1/betadrop_upload_sessions?upload_id=eq.${upload_id}`,
      {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "apikey": supabaseServiceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed", final_path: publicUrl }),
      }
    );

    return jsonResponse({ success: true, url: publicUrl });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
});
