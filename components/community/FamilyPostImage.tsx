
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface FamilyPostImageProps {
  imagePath: string;
}

export default async function FamilyPostImage({
  imagePath,
}: FamilyPostImageProps) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("family-post-images")
    .createSignedUrl(imagePath, 180);

  if (error || !data?.signedUrl) {
    return (
      <p className="mt-4 text-xs text-white/50">
        Foto no disponible.
      </p>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl">
      <Image
        src={data.signedUrl}
        alt="Fotografía compartida con la familia"
        width={1200}
        height={900}
        unoptimized
        className="h-auto w-full object-contain"
      />
    </div>
  );
}
