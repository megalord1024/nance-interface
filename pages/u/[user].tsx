import { useVotesOfAddress } from "@/utils/hooks/snapshot/Proposals";
import { formatDistanceToNow, fromUnixTime } from "date-fns";
import {
  withDefault,
  NumberParam,
  useQueryParams,
  StringParam,
} from "next-query-params";
import { processChoices } from "@/utils/functions/snapshotUtil";
import { Pagination, ScrollToBottom } from "@/components/PageButton";
import Link from "next/link";
import { shortenAddress } from "@/utils/functions/address";
import { classNames } from "@/utils/functions/tailwind";
import { useAllSpaceInfo } from "@/utils/hooks/NanceHooks";
import useSWR, { Fetcher } from "swr";
import { ProfileResponse } from "../api/profile";
import { Disclosure, Listbox, Transition } from "@headlessui/react";
import { Fragment, useContext } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { NetworkContext } from "@/context/NetworkContext";
import { getAddressLink } from "@/utils/functions/EtherscanURL";
import { Footer, SiteNav } from "@/components/Site";
import { getProposalNumber } from "@/utils/functions/ProposalIdNumber";

const getColorOfChoice = (choice: string) => {
  if (choice == "For") {
    return "text-green-500";
  } else if (choice == "Against") {
    return "text-red-500";
  } else if (choice == "Abstain") {
    return "text-gray-500";
  } else {
    return "";
  }
};

const formatter = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  compactDisplay: "short",
});
const formatNumber = (num: number) => formatter.format(num);

const fetcher: Fetcher<
  ProfileResponse,
  { url: string; voter: string; space: string }
> = async ({ url, voter, space }) => {
  const res = await fetch(url + new URLSearchParams({ voter, space }));
  const json = await res.json();
  if (res.status !== 200) {
    throw new Error(`An error occurred while fetching the data: ${json?.err}`);
  }
  return json;
};

interface ENSIdeasResponse {
  address: string;
  name: string;
  displayName: string;
  avatar: string;
  error?: string;
}

export async function getServerSideProps(context: any) {
  const user = context.params.user;

  try {
    const res = await fetch(`https://api.ensideas.com/ens/resolve/${user}`);
    const json: ENSIdeasResponse = await res.json();

    if (!json.error) {
      return {
        props: {
          ensInfo: {
            address: json.address || user,
            name: json.name,
            displayName: json.displayName,
            avatar: json.avatar,
          },
        },
      };
    }
  } catch (e) {
    console.warn("❌ user.ENSIdeasAPI.fetch.error", e);
  }

  return {
    props: {
      ensInfo: {
        address: user,
        name: user,
        displayName: shortenAddress(user),
        avatar: "",
      },
    },
  };
}

export default function NanceUserPage({
  ensInfo,
}: {
  ensInfo: ENSIdeasResponse;
}) {
  const network = useContext(NetworkContext);
  const [query, setQuery] = useQueryParams({
    page: withDefault(NumberParam, 1),
    limit: withDefault(NumberParam, 25),
    space: StringParam,
  });

  const address = ensInfo.address;
  const { data, loading } = useVotesOfAddress(
    address,
    (query.page - 1) * query.limit,
    query.limit,
    query.space || "",
  );

  const { data: allSpaceInfo } = useAllSpaceInfo();
  const snapshotToNanceSpaceMap: { [key: string]: string } = {};
  allSpaceInfo?.data?.forEach((spaceInfo) => {
    snapshotToNanceSpaceMap[spaceInfo.snapshotSpace] = spaceInfo.name;
  });
  // FIXME temp workaround, mapping jbdao.eth to juicebox space
  snapshotToNanceSpaceMap["jbdao.eth"] = "juicebox";
  function getProposalLink(spaceId: string, proposalId: string) {
    // Direct user to nance proposal page if eligible
    const nanceSpaceName = snapshotToNanceSpaceMap[spaceId];
    if (nanceSpaceName) {
      return `/s/${nanceSpaceName}/${proposalId}`;
    } else {
      return `https://snapshot.org/#/${spaceId}/proposal/${proposalId}`;
    }
  }

  const { data: userProfileInfo } = useSWR(
    query.space
      ? { url: "/api/profile?", voter: address, space: query.space }
      : null,
    fetcher,
  );

  return (
    <>
      <SiteNav
        pageTitle={`Profile of ${ensInfo?.displayName || address}`}
        description="Voter profile on Nance."
        image={`https://cdn.stamp.fyi/avatar/${address}`}
        withWallet
      />

      <div className="min-h-full">
        <main className="py-2">
          <div className="mx-auto mt-4 grid max-w-5xl grid-cols-1 gap-6 sm:px-6 lg:max-w-7xl lg:grid-flow-col-dense lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2 lg:col-start-1">
              {/* Votes */}
              <section aria-labelledby="proposal-title">
                <div>
                  {data?.votedData?.map((vote) => (
                    <div
                      key={vote.id}
                      className="my-4 flex bg-white px-4 py-4 shadow sm:rounded-lg sm:px-6"
                    >
                      <div
                        className={classNames(
                          "flex flex-col space-y-1",
                          vote.reason ? "w-1/2" : "",
                        )}
                      >
                        <Link
                          href={getProposalLink(
                            vote.space.id,
                            vote.proposal.id,
                          )}
                          className=""
                        >
                          {vote.proposal.title}
                        </Link>
                        <span
                          className={classNames(
                            getColorOfChoice(
                              processChoices(
                                vote.proposal.type,
                                vote.choice,
                              ) as string,
                            ),
                            "",
                          )}
                        >
                          {
                            processChoices(
                              vote.proposal.type,
                              vote.choice,
                            ) as string
                          }{" "}
                          with {formatNumber(vote.vp)}
                        </span>
                        <p className="text-sm text-gray-500">
                          {!query.space ? `${vote.space.name}, ` : ""}
                          {formatDistanceToNow(fromUnixTime(vote.created), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {vote.reason && (
                        <p className="ml-4 w-1/2 break-words border-l-2 pl-4 text-gray-500">
                          {vote.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section
              aria-labelledby="stats-title"
              className="lg:col-span-1 lg:col-start-3"
            >
              <div
                className="sticky bottom-6 top-6 mt-4 bg-white px-4 py-5 opacity-100 shadow sm:rounded-lg sm:px-6"
                style={{
                  maxHeight: "calc(100vh - 9rem)",
                }}
              >
                <a
                  href={getAddressLink(address, network)}
                  className="text-xs text-gray-500"
                >
                  {shortenAddress(address)}
                </a>
                <h2
                  id="applicant-information-title"
                  className="flex text-3xl font-medium"
                >
                  <Image
                    src={`https://cdn.stamp.fyi/avatar/${address}`}
                    alt={`Avatar of ${address}`}
                    className="h-10 w-10 rounded-full p-1"
                    height={40}
                    width={40}
                  />
                  {ensInfo?.displayName || address}
                </h2>

                <div className="mt-2 flex place-items-center justify-between space-x-2">
                  <Listbox
                    value={query.space}
                    onChange={(t) => setQuery({ space: t })}
                  >
                    {({ open }) => (
                      <>
                        <div className="relative grow">
                          <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
                            <span className="block truncate">
                              Space: {query.space}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronDownIcon
                                className="h-5 w-5 text-gray-400"
                                aria-hidden="true"
                              />
                            </span>
                          </Listbox.Button>

                          <Transition
                            show={open}
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {allSpaceInfo?.data
                                ?.filter((s) => s.snapshotSpace)
                                .map((nanceSpace) => (
                                  <Listbox.Option
                                    key={nanceSpace.snapshotSpace}
                                    className={({ active }) =>
                                      classNames(
                                        active
                                          ? "bg-indigo-600 text-white"
                                          : "text-gray-900",
                                        "relative cursor-default select-none py-2 pl-3 pr-9",
                                      )
                                    }
                                    value={nanceSpace.snapshotSpace}
                                  >
                                    {({ selected, active }) => (
                                      <>
                                        <span
                                          className={classNames(
                                            selected
                                              ? "font-semibold"
                                              : "font-normal",
                                            "block truncate",
                                          )}
                                        >
                                          {nanceSpace.name}
                                        </span>

                                        {selected ? (
                                          <span
                                            className={classNames(
                                              active
                                                ? "text-white"
                                                : "text-indigo-600",
                                              "absolute inset-y-0 right-0 flex items-center pr-4",
                                            )}
                                          >
                                            <CheckIcon
                                              className="h-5 w-5"
                                              aria-hidden="true"
                                            />
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </>
                    )}
                  </Listbox>

                  <XMarkIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                    onClick={() => setQuery({ space: "" })}
                  />
                </div>

                {query.space && !userProfileInfo && (
                  <div className="mt-4 animate-pulse">
                    <div className="flex justify-between">
                      <p>Voting power</p>
                      <p className="text-gray-500"></p>
                    </div>

                    <div className="flex justify-between">
                      <p>Proposals voted</p>
                      <p className="text-gray-500"></p>
                    </div>

                    <div className="flex justify-between">
                      <p>For / Against / Abstain</p>
                      <p className="text-gray-500"></p>
                    </div>

                    <div className="flex justify-between">
                      <p>Proposals created</p>
                      <p className="text-gray-500"></p>
                    </div>

                    <div className="flex justify-between">
                      <p>Delegated from</p>
                      <p className="text-gray-500"></p>
                    </div>
                  </div>
                )}

                {query.space && userProfileInfo && (
                  <div className="mt-4">
                    <div className="flex justify-between">
                      <p>Voting power</p>
                      <p className="text-gray-500">
                        {formatNumber(userProfileInfo?.vp ?? 0)}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p>Proposals voted</p>
                      <p className="text-gray-500">
                        {userProfileInfo?.votes.total || 0}
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <p>For / Against / Abstain</p>
                      <p className="text-gray-500">
                        {userProfileInfo
                          ? `${userProfileInfo?.votes.for} / ${userProfileInfo?.votes.against} / ${userProfileInfo?.votes.abstain}`
                          : `0 / 0 / 0`}
                      </p>
                    </div>

                    <Disclosure>
                      {({ open }) => (
                        <>
                          <Disclosure.Button
                            as="div"
                            className="flex justify-between"
                          >
                            <p>Proposals created</p>
                            <div className="flex place-items-center text-gray-500">
                              <p>{userProfileInfo?.proposals.length || 0}</p>
                              <ChevronRightIcon
                                className={
                                  open
                                    ? "h-5 w-5 rotate-90 transform"
                                    : "h-5 w-5"
                                }
                              />
                            </div>
                          </Disclosure.Button>
                          <Disclosure.Panel as="div">
                            <ul className="text-gray-500">
                              {userProfileInfo?.proposals
                                ?.sort(
                                  (a, b) =>
                                    (getProposalNumber(b.proposalId?.toString() || "0")) - (getProposalNumber(a.proposalId?.toString() || "0")),
                                )
                                .map((p) => (
                                  <li key={p.uuid}>
                                    <a
                                      href={getProposalLink(
                                        query.space || "",
                                        p.uuid,
                                      )}
                                      className="flex justify-between space-x-2"
                                    >
                                      <p className="w-1/3">{`Prop ${
                                        p.proposalId ? p.proposalId : "tbd"
                                      }`}</p>
                                      <p className="line-clamp-1 w-2/3">
                                        {p.title}
                                      </p>
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>

                    <div className="flex justify-between">
                      <p>Delegated from</p>
                      <p className="text-gray-500">
                        {userProfileInfo?.delegators.length || 0}{" "}
                        {userProfileInfo?.delegators.length > 1
                          ? "address"
                          : "address"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <ScrollToBottom />
          <div className="flex justify-center">
            <div className="max-w-5xl">
              <Pagination
                page={query.page}
                setPage={(p) => setQuery({ page: p })}
                limit={query.limit}
                total={userProfileInfo?.votes.total || 0}
                infinite={!userProfileInfo}
              />
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}
