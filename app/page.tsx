import Image from "next/image";
import BriefForm from "./components/BriefForm";
import ClarificationsList from "./components/ClarificationsList";
import BacklogView from "./components/BacklogView";
import CreateIssuesButton from "./components/CreateIssuesButton";

export default function Home() {
  return (
    <>
      <BriefForm />
      <CreateIssuesButton briefId="" items={[]} />
    </>
  );
}
