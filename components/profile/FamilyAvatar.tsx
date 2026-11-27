
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

interface FamilyAvatarProps {
    avatarPath: string | null;
    name: string;
    size?: number;
    portrait?: boolean;
}

export default async function FamilyAvatar({
                                               avatarPath,
                                               name,
                                               size = 96,
                                               portrait = false,
                                           }: FamilyAvatarProps) {
    let url: string | null = null;

    if (avatarPath) {
        const supabase = await createClient();

        const { data, error } = await supabase.storage
            .from("family-avatars")
            .createSignedUrl(avatarPath, 300);

        if (!error) {
            url = data.signedUrl;
        }
    }

    return (
        <div
            className={portrait ? "gala-portrait-frame" : "mx-auto flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10"}
            style={portrait ? undefined : { width: size, height: size }}
        >
            {url ? (
                <Image
                    src={url}
                    alt={`Foto de ${name}`}
                    width={size}
                    height={size}
                    unoptimized
                    className="h-full w-full object-cover"
                />
            ) : (
                <span
                    className={portrait ? "gala-portrait-initial" : "font-serif text-[#e6c785]"}
                    style={portrait ? undefined : { fontSize: size * 0.4 }}
                >
          {name.trim().charAt(0).toUpperCase()}
        </span>
            )}
        </div>
    );
}
