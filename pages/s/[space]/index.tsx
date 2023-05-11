import SiteNav from "../../../components/SiteNav"
import { useRouter } from "next/router"
import Footer from "../../../components/Footer"
import NanceSpace from "../../../components/nance/Space";

export default function NanceSpacePage() {
  const router = useRouter();
  let space = router.query.space as string;
  return (
    <>
      <SiteNav pageTitle="JuiceboxDAO Governance" description="JuiceboxDAO Governance Platform" image="/images/opengraph/homepage.png" withWallet />
      <NanceSpace space={space} proposalUrlPrefix={`/s/${space}/`} />
      <Footer />
    </>
  )
}
