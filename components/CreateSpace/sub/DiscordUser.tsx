import { useEffect, useState } from "react";
import { LOCAL_STORAGE_KEY_DISCORD_STATUS } from "@/utils/functions/discordURL";
import { useFetchDiscordUser, useLogoutDiscordUser } from "@/utils/hooks/DiscordHooks";
import { avatarBaseUrl } from "@/constants/Discord";
import { discordAuthWindow } from "@/utils/functions/discord";
import Image from "next/image";

export default function DiscordUser({ address }: { address: string }) {
  // state
  const [shouldFetchDiscordUser, setShouldFetchDiscordUser] = useState(false);

  const { data: discordUser, isLoading: discordLoading } = useFetchDiscordUser(
    { address },
    shouldFetchDiscordUser,
  );

  const { trigger: discordLogoutTrigger } = useLogoutDiscordUser(
    { address },
    !!discordUser,
  );


  useEffect(() => {
    // check if there is a recent LOCAL_STORAGE_KEY_DISCORD_STATUS we can use
    const discordStatus = localStorage.getItem(
      LOCAL_STORAGE_KEY_DISCORD_STATUS,
    );
    if (discordStatus === "success") setShouldFetchDiscordUser(true);
    function handleStorageChange(event: StorageEvent) {
      if (event.key === LOCAL_STORAGE_KEY_DISCORD_STATUS) {
        if (event.newValue === "success") setShouldFetchDiscordUser(true);
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <>
      {!discordUser?.username && !discordLoading && (
        <div className="flex justify-center">
          <button
            className="text-sm inline-flex w-fit items-center justify-center rounded-md border border-transparent bg-purple-800 px-4 py-2 text-white shadow-sm hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-black disabled:opacity-50"
            onClick={() => {
              localStorage.removeItem(LOCAL_STORAGE_KEY_DISCORD_STATUS);
              discordAuthWindow();
            }}
          >
          Connect Discord
          </button>
        </div>
      )}
      <div className="flex justify-center">
        {discordLoading && (
          <div
            className="inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-current border-t-transparent text-blue-600"
            role="status"
            aria-label="loading"
          ></div>
        )}
      </div>
      {!discordLoading && discordUser?.avatar && (
        <>
          <div className="flex justify-center">
            <div className="block text-center">
              <p className="">{`${discordUser?.username}`}</p>
              <a
                className="text-xs underline hover:cursor-pointer"
                onClick={() => {
                  discordLogoutTrigger();
                  // set local storage to false, then refresh
                  localStorage.removeItem(
                    LOCAL_STORAGE_KEY_DISCORD_STATUS,
                  );
                  window.location.assign(window.location.pathname);
                }}
              >
              disconnect
              </a>
            </div>
            <Image
              className="ml-4 overflow-hidden rounded-full"
              src={`${avatarBaseUrl}/${discordUser?.id}/${discordUser?.avatar}.png`}
              alt={discordUser?.username || ""}
              width={50}
              height={50}
            />
          </div>
        </>
      )}
    </>
  );
}