import Link from 'next/link'
import SiteNav from '../components/SiteNav'

export default function Home() {
  return (
    <>
      <SiteNav pageTitle={`Home`} currentIndex={0} />
      <div className="px-8">
        <div className="py-16 flex-1 flex flex-col items-center">
          <h1 className="text-7xl font-medium">
            JuiceTool
          </h1>
          <br/>

          <div className="mt-5 sm:mx-auto grid grid-cols-2 xs:gap-3 sm:gap-8 sm:justify-center md:mt-12 lg:grid-flow-col">
            <HomeCard link="/progress" linkText="Feature Progress" imgSrc="images/character/orange_lady.png" bgColor="bg-red-500" />
            <HomeCard link="/metric" linkText="Health Metrics" imgSrc="images/character/banana.png" bgColor="bg-emerald-500" />
            <HomeCard link="/funding" linkText="Funded Projects" imgSrc="images/character/pina.png" bgColor="bg-sky-500" />
            <HomeCard link="/history" linkText="Timeline" imgSrc="images/character/blueberry.png" bgColor="bg-purple-500" />
          </div>

          <div className="mt-5 sm:mx-auto grid grid-rows-2 xs:gap-3 sm:gap-4 sm:justify-center md:mt-12 lg:grid-flow-row">
            <span className='text-3xl'>Tools</span>
            <Link href="/snapshot/jbdao.eth">
              <span>
                <span className='underline'>Snapshot Plus</span>
                , search in titles, filters, overview and more.
              </span>
            </Link>
            <Link href="/juicebox">
              <span>
                <span className='underline'>Juicebox Reconfiguration Helper</span>
                , import/export hex data, preview with basic interface.
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function HomeCard({ link, linkText, imgSrc, bgColor }) {
  return (
      <Link href={link}>
        <div className="mt-3 sm:mt-0">
          <div>
            <button className="group block text-nouns rounded-xl sm:cursor-pointer transition duration-200 xs:h-40 xs:w-40 sm:h-48 sm:w-48 bg-gray-100 focus-within:ring-2 relative focus-within:ring-offset-2 focus-within:ring-offset-gray-100 hover:ring-2 hover:ring-grey-base focus-within:ring-grey-base overflow-hidden m-auto">
              <div className={`absolute bottom-0 w-full px-4 py-1 justify-center text-lg flex items-end ${bgColor} font-light text-white shadow-lg`}>
                {linkText}
              </div>
              <img className="object-cover w-full h-full" src={imgSrc} alt={linkText} />
            </button>
          </div>
        </div>
      </Link>
  )
}