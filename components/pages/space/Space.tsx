import { formatDistanceToNowStrict, parseISO, format } from "date-fns";
import { useQueryParams, StringParam, withDefault, BooleanParam, NumberParam } from "next-query-params";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useState } from "react";
import { useSpaceInfo, useProposals } from "../../../hooks/NanceHooks";
import ScrollToBottom from "../../ScrollToBottom";
import SearchableComboBox, { Option } from "../../SearchableComboBox";
import ProposalCards from "./ProposalCards";
import { getLastSlash } from "../../../libs/nance";
import Pagination from "../../Pagination";
import { Tooltip } from "flowbite-react";
import { Switch } from "@headlessui/react";
import { classNames } from "../../../libs/tailwind";
import { BanknotesIcon, BoltIcon, DocumentMagnifyingGlassIcon, DocumentTextIcon, ShieldCheckIcon, Square3Stack3DIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import LoadingArrowSpiner from "../../LoadingArrowSpiner";
import SearchableComboBoxMultiple from "../../SearchableComboBoxMultiple";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const QueueExecutionModal = dynamic(() => import("./QueueReconfigurationModal"), {
  loading: () => <LoadingArrowSpiner />,
});
const QueueTransactionsModal = dynamic(() => import("./QueueTransactionsModal"), {
  loading: () => <LoadingArrowSpiner />,
});

function getDriver(action: () => void) {
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        element: "#new-proposal-button",
        popover: {
          title: "Create new proposal",
          description: "You can request payouts, reserve tokens and custom transactions.",
          side: "left", align: 'start'
        },
      },
      {
        element: "#cycle-select-box",
        popover: {
          title: "Select the cycle",
          description: "Proposals are grouped by cycles, you can select the cycle you want to view.",
          side: "top", align: 'start'
        },
      },
      {
        element: "#search-bar",
        popover: {
          title: "Search proposals with keywords",
          description: "You can search proposals with keywords, which can be the words in the title or the content. Use space to separate multiple keywords.",
          side: "bottom", align: 'start'
        },
      },
      {
        element: "#proposals-table",
        popover: {
          title: "View proposals",
          description: "All proposals are listed here. You can view the details of each proposal by clicking the proposal.",
          side: "top", align: 'start'
        },
      },
      {
        element: "#proposals-table-head",
        popover: {
          title: "Sort proposals",
          description: "You can sort proposals by clicking the table headers. And to reverse the order, just click again.",
          side: "bottom", align: 'start'
        },
      },
      {
        element: "#pagination-div",
        popover: {
          title: "Check other pages",
          description: "You can check other pages by clicking the left or right arrow.",
          side: "top", align: 'start'
        },
      },
    ],
    onDestroyStarted: () => {
      if (!driverObj.hasNextStep() || confirm("Are you sure?")) {
        driverObj.destroy();
        action();
      }
    },
  });

  return driverObj;
}

export default function NanceSpace({ space, proposalUrlPrefix = "/p/" }: { space: string, proposalUrlPrefix?: string }) {
  // State
  const [cycleOptions, setCycleOptions] = useState<Option[]>();
  const [options, setOptions] = useState<Option[]>([{ id: "Loading", label: `Loading...`, status: true }]);
  const [keywordInput, setKeywordInput] = useState<string>();
  const [showDrafts, setShowDrafts] = useState(true);
  const [showQueueReconfigurationModal, setShowQueueReconfigurationModal] = useState(false);
  const [showQueueTransactionsModal, setShowQueueTransactionsModal] = useState(false);

  // QueryParams
  const router = useRouter();
  const [query, setQuery] = useQueryParams({
    keyword: StringParam,
    limit: withDefault(NumberParam, 20),
    page: withDefault(NumberParam, 1),
    sortBy: withDefault(StringParam, ''),
    sortDesc: withDefault(BooleanParam, true),
    cycle: StringParam,
    guide: withDefault(BooleanParam, false)
  });
  const { keyword, cycle, limit, page } = query;

  // External Hooks
  const { data: infoData, isLoading: infoLoading, error: infoError } = useSpaceInfo({ space }, router.isReady);
  const { data: proposalData, isLoading: proposalsLoading, error: proposalError } = useProposals({ space, cycle, keyword, page, limit }, router.isReady);
  const loading = infoLoading || proposalsLoading;
  const isCurrentCycle = cycle && infoData?.data?.currentCycle && cycle === infoData?.data?.currentCycle.toString();
  const allCycle = { id: "All", label: `All`, status: true };

  const projectId = parseInt(infoData?.data?.juiceboxProjectId || "1");

  // Flag
  const hasDrafts = (proposalData?.data?.privateProposals?.length ?? 0) > 0;

  // Data process
  let remainingTime = "-";
  let endTime;
  let formattedEndTime = "-";
  try {
    endTime = parseISO(infoData?.data?.currentEvent?.end ?? "");
    formattedEndTime = endTime ? format(endTime, 'EEE MMM dd yyyy HH:mm a') : '-';
    remainingTime = formatDistanceToNowStrict(endTime);
  } catch (error) {
    //console.warn("🔴 Nance.formatDistanceToNowStrict ->", error);
  }

  // Effects to sync UI
  useEffect(() => {
    // if we can retrieve the current cycle from infoData, then we can populate the options
    const _currentCycle = infoData?.data?.currentCycle;
    console.log("🟢 NanceSpace.useEffect -> _currentCycle", _currentCycle);
    const newOptions: Option[] = [];
    if (_currentCycle) {
      newOptions.push(allCycle);
      const nextCycle = _currentCycle + 1;
      newOptions.push({ id: `${nextCycle}`, label: `GC-${nextCycle} (Next)`, status: true });
      newOptions.push({ id: `${_currentCycle}`, label: `GC-${_currentCycle} (Current)`, status: true });
      for (let i = _currentCycle - 1; i >= 1; i--) {
        newOptions.push({ id: `${i}`, label: `GC-${i}`, status: false });
      }

      setOptions(newOptions);
    }
  }, [infoData]);

  // sync cycle option with the query params
  useEffect(() => {
    if (!cycle) {
      if (keyword) {
        // if there is a keyword but no cycle specified by user, then we should set the cycle to "All"
        setQuery({ cycle: allCycle.id });
      } else {
        // otherwise, we should set the cycle to current cycle and nexy cycle
        const _currentCycle = infoData?.data?.currentCycle;
        if (_currentCycle) {
          setQuery({ cycle: _currentCycle.toString() });
        }
      }
    } else {
      // cycle is 123 + 32 format
      const _cycles = cycle.split("+");
      const _cycleOptions = _cycles.map(c => {
        const _cycleOption = options.find(o => o.id === c);
        if (_cycleOption) {
          return _cycleOption;
        } else {
          return { id: c, label: `GC-${c}`, status: false };
        }
      });
      setCycleOptions(_cycleOptions);
    }
  }, [keyword, cycle, options, infoData, setQuery, allCycle.id]);

  // sync keyword input with the query params
  useEffect(() => {
    if (keyword != keywordInput) {
      setKeywordInput(keyword ?? "");
    }
  }, [keyword]);

  useLayoutEffect(() => {
    if (query.guide && !loading) {
      getDriver(() => setQuery({ guide: false })).drive();
    }
  }, [query.guide, loading, setQuery]);

  return (
    <div className="m-4 lg:m-6 flex justify-center lg:px-20">
      <div className="flex flex-col max-w-7xl w-full">

        {/* Page header */}
        <div className="max-w-7xl md:flex md:space-x-5 bg-white p-6 shadow rounded-md">
          <div className="flex flex-col space-x-0 space-y-6 items-center md:flex-row md:justify-between md:space-x-6 md:space-y-0 w-full">
            <div className="flex-shrink-0 md:w-5/12 flex space-x-3">
              <Image
                className="h-16 w-16 rounded-full"
                src={`https://cdn.stamp.fyi/space/${infoData?.data?.snapshotSpace}?s=160`}
                alt={`${space} Logo`}
                height={64} width={64}
              />

              <div>
                <h1 className="text-4xl font-bold text-gray-900">{space}</h1>
                <p className="text-sm font-medium text-gray-500 text-right">powered by Nance</p>
              </div>
            </div>

            <div className="break-words p-2 md:w-2/12 text-center rounded-md border-2 border-blue-600 bg-indigo-100">
              <Tooltip content={formattedEndTime}>
                <span className="tooltip-trigger">
                  <p className="text-2xl font-semibold">{remainingTime} remaining</p>
                </span>
              </Tooltip>
              <a className="text-sm text-gray-900"
                href="https://info.juicebox.money/dao/process/" target="_blank" rel="noopener noreferrer">
                {infoData?.data?.currentEvent?.title || "Unknown"} of GC{infoData?.data?.currentCycle}
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl flex flex-col space-y-2 md:flex-row md:space-x-5 md:space-y-0 bg-white mt-2 p-2 shadow rounded-md">
          <Link
            id="new-proposal-button"
            href={`/s/${space}/edit`}
            className="md:ml-2 inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <DocumentTextIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            New Proposal
          </Link>

          <button
            type="button"
            onClick={() => {
              setQuery({ cycle: infoData?.data?.currentCycle.toString() });
              setShowQueueReconfigurationModal(true);
            }}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BanknotesIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Queue Reconfiguration
          </button>
          {showQueueReconfigurationModal && <QueueExecutionModal open={showQueueReconfigurationModal} setOpen={setShowQueueReconfigurationModal} juiceboxProjectId={projectId} proposals={proposalData?.data} space={space} currentCycle={infoData?.data?.currentCycle} />}

          <button
            type="button"
            onClick={() => {
              setQuery({ cycle: infoData?.data?.currentCycle.toString() });
              setShowQueueTransactionsModal(true);
            }}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BoltIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Queue Transactions
          </button>
          {showQueueTransactionsModal && <QueueTransactionsModal open={showQueueTransactionsModal} setOpen={setShowQueueTransactionsModal} juiceboxProjectId={projectId} proposals={proposalData?.data} space={space} />}

          <Link
            href={`/review?project=${projectId}`}
            className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <ShieldCheckIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Review Reconfiguration
          </Link>

        </div>

        <div className="flex mt-6 flex-col space-y-2 md:justify-between md:flex-row md:space-x-4 md:space-y-0">
          {hasDrafts && (
            <div className="md:w-1/12">
              <Switch.Group as="div" className="flex flex-col">
                <Switch.Label as="span" className="text-sm">
                  <span className="font-medium text-gray-900">Show drafts</span>
                </Switch.Label>
                <Switch
                  checked={showDrafts}
                  onChange={setShowDrafts}
                  className={classNames(
                    showDrafts ? 'bg-indigo-600' : 'bg-gray-200',
                    'relative mt-2 inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={classNames(
                      showDrafts ? 'translate-x-5' : 'translate-x-0',
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
                    )}
                  />
                </Switch>
              </Switch.Group>
            </div>
          )}


          <div id="cycle-select-box" className={hasDrafts ? "md:w-2/12" : "md:w-3/12"}>
            <SearchableComboBoxMultiple val={cycleOptions} setVal={(options) => {
              setCycleOptions(options);
              // sync with cycle parameter
              setQuery({
                cycle: options.map((option) => option.id).join("+")
              });
            }} options={options} label="Select cycle" />
          </div>

          {/* Search bar and limit */}
          <div className="md:w-9/12" id="search-bar">
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
              Search proposals
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <div className="relative flex flex-grow items-stretch focus-within:z-10">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <DocumentMagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="keyword"
                  id="keyword"
                  className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="grant, swap and payout etc."
                  value={keywordInput !== undefined ? keywordInput : (keyword ?? "")}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key == "Enter") {
                      setQuery({
                        keyword: keywordInput
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>

        </div>

        <div>
          <ProposalCards proposalUrlPrefix={proposalUrlPrefix} loading={loading} proposalsPacket={proposalData?.data} maxCycle={(infoData?.data?.currentCycle ?? 0) + 1} showDrafts={showDrafts} />
        </div>

        <Pagination page={page} setPage={(p) => setQuery({ page: p })} limit={limit} total={0} infinite />

        <div className="mt-2 text-center">
          {infoData?.data?.dolthubLink && (
            <p className="text-center text-xs text-gray-500">
              ∴ dolt commit <a href={infoData?.data?.dolthubLink} target="_blank" rel="noopener noreferrer">{getLastSlash(infoData?.data?.dolthubLink)?.slice(0, 7)}</a>
            </p>
          )}
        </div>

        <ScrollToBottom />
      </div>
    </div>
  );
}
