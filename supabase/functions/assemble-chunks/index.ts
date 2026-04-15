import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CHUNKS_BUCKET = "betadrop_chunks";

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const { upload_id } = await req.json();

    if (!upload_id) {
      return new Response(JSON.stringify({ error: "upload_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Upload session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = sessions[0];

    if (session.status === "completed") {
      return new Response(JSON.stringify({ error: "Upload already completed", url: session.final_path }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      const chunkPath = `${upload_id}/chunk_${i}`;
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

      return new Response(JSON.stringify({ error: "Missing chunks" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Failed to upload assembled file" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = `${upload_id}/chunk_${i}`;
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

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
