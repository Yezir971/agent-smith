import Image from "next/image";
import BriefForm from "./components/BriefForm";
import ClarificationsList from "./components/ClarificationsList";

export default function Home() {
  return (
    <>
      <BriefForm />
      <ClarificationsList briefId="" clarifications={[]} />
    </>
  );
}
