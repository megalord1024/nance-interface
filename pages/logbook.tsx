import { useEffect, useState } from 'react'
import fetchProjectEvents, { ProjectEvent } from '../hooks/juicebox/ProjectEvents'
import FormattedAddress from '../components/FormattedAddress'
import { formatDistanceToNow, fromUnixTime } from 'date-fns'
import SiteNav from '../components/SiteNav'
import { NumberParam, useQueryParam, withDefault } from 'next-query-params'
import Pagination from '../components/Pagination'
import ResolvedProjectWithMetadata from '../components/ResolvedProjectWithMetadata'
import { commify, formatEther } from 'ethers/lib/utils'
import { useSymbolOfERC20, useTokenAddressOfProject } from '../hooks/juicebox/TokenOfProject'
import { invalidateZeroAddress } from '../libs/address'

export default function LogbookPage() {
  const [events, setEvents] = useState<ProjectEvent[]>([])
  const [page, setPage] = useQueryParam('page', withDefault(NumberParam, 1))
  const [limit, setLimit] = useQueryParam('limit', withDefault(NumberParam, 30))

  useEffect(() => {
    fetchProjectEvents(limit, Math.max((page-1)*limit, 0)).then(data => {
      console.debug("Project Events", data)
      setEvents(data)
    })
  }, [page, limit])

  return (
    <div className="bg-white">
      <SiteNav pageTitle='Juicebox Logbook' />
      <div className="flex p-6 justify-center">
        <ul role="list" className="-mb-8">
          {events.map((event, index) => (
            <li key={event.id}>
              <div className="relative pb-8 truncate">
                {index !== events.length - 1 ? (
                  <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                ) : null}
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <img
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-400 ring-8 ring-white"
                      src={`https://cdn.stamp.fyi/avatar/${event.caller || 0}?s=160`}
                      alt=""
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div>
                      <div className="text-sm">
                        <FormattedAddress address={event.caller} style={"font-bold"} /> · <p className="mt-0.5 text-sm text-gray-500 inline">{formatDistanceToNow(fromUnixTime(event.timestamp), { addSuffix: true })}</p>
                      </div>
                      <p className="mt-0.5 text-sm"><a className="text-blue-700 font-bold" href={`https://etherscan.io/tx/${event.txHash}`}>{event.eventType}</a> on
                        <ResolvedProjectWithMetadata version={parseInt(event.project.cv[0])} projectId={event.project.projectId} handle={event.project.handle} metadataUri={event.project.metadataUri} style={"text-xs text-black font-semibold"} />
                      </p>
                    </div>
                    {event.memo && (
                      <p className="text-sm truncate hidden sm:block">{event.memo}</p>
                    )}
                    {event.eventType === "Pay" && <PayCard event={event} />}
                    {event.eventType === "Redeem" && <RedeemCard event={event} />}
                    {(event.eventType === "Tap" || event.eventType === "DistributePayouts") && <DistributePayoutsCard event={event} />}
                    
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Pagination page={page} setPage={setPage} limit={limit} total={1000} />
    </div>
  )
}

function PayCard({ event }: { event: ProjectEvent }) {
  const ethAmount = commify(parseFloat(formatEther(event.ethAmount)).toFixed(3));

  return (
    <div className="mt-2 text-sm text-gray-700 rounded-lg shadow p-2 border-slate-400 flex justify-between">
      <img className="inline h-12 w-12" src="https://cdn.stamp.fyi/token/0x0000000000000000000000000000000000000000" alt="ETH" />
      <div className="text-2xl text-center content-center">{`- ${ethAmount} ETH`}</div>
    </div>
  )
}

function RedeemCard({ event }: { event: ProjectEvent }) {
  const ethAmount = commify(parseFloat(formatEther(event.ethAmount)).toFixed(3));
  const tokenAmount = commify(parseFloat(formatEther(event.tokenAmount)).toFixed(3));
  const { value: tokenAddress } = useTokenAddressOfProject(parseInt(event.project.cv[0]), event.project.projectId);
   const { value: tokenSymbol } = useSymbolOfERC20(tokenAddress);

  return (
    <div className="mt-2">
      {ethAmount !== "0.0" && (
        <div className="mt-2 text-sm text-gray-700 rounded-lg shadow p-2 border-slate-400 flex justify-between">
          <img className="inline h-12 w-12" src="https://cdn.stamp.fyi/token/0x0000000000000000000000000000000000000000" alt="ETH" />
          <div className="text-2xl text-center content-center">{`+ ${ethAmount} ETH`}</div>
        </div>
      )}
      
      {tokenAmount !== "0.0" && (
        <div className="mt-2 text-sm text-gray-700 rounded-lg shadow p-2 border-slate-400 flex justify-between space-x-2">
          <img className="inline h-12 w-12" src={invalidateZeroAddress(tokenAddress) ? `https://cdn.stamp.fyi/token/${tokenAddress}` : "/images/unknown.png"} alt="token" />
          <div className="text-2xl text-center content-center">{`- ${tokenAmount} ${tokenSymbol || "TOKEN"}`}</div>
        </div>
      )}
    </div>
    
  )
}

function DistributePayoutsCard({ event }: { event: ProjectEvent }) {
  const ethAmount = commify(parseFloat(formatEther(event.ethAmount)).toFixed(3));

  return (
    <div className="mt-2 text-sm text-gray-700 rounded-lg shadow p-2 border-slate-400 flex justify-between">
      <img className="inline h-12 w-12" src="https://cdn.stamp.fyi/token/0x0000000000000000000000000000000000000000" alt="ETH" />
      <div className="text-2xl text-center content-center">{`${ethAmount} ETH`}</div>
    </div>
  )
}