import { ThirdwebNftMedia, useAddress, Web3Button } from "@thirdweb-dev/react";
import { NFT, TransactionError } from "@thirdweb-dev/sdk";
import Image from "next/image";
import { useCallback, useContext, useEffect, useState } from "react";
import { EventContext } from "../contexts/event-context";
import { GameContext } from "../contexts/game-context";
import { CONTRACT_ADDR } from "../utils/constants";
import { isOwnEvent } from "../utils/utils";
import { Event, EventProps } from "./events";

type ModalProps = {
  isOpen: boolean;
  close: () => void;
  level: 1 | 2 | 3;
};

const modalText = {
  1: {
    title: "Send your cat to someone",
    description: (
      <>
        Enter their wallet address or select a current player to transfer your{" "}
        <span className="font-bold text-white">Kitten</span> to.
      </>
    ),
    button: "Send Kitten",
  },
  2: {
    title: "Burn your cat!",
    description: (
      <>
        Burn your <span className="font-bold text-white">Grumpy Cat</span>.
      </>
    ),
    button: "Burn Cat",
  },
  3: {
    title: "Attack another cat!",
    description:
      "Enter their wallet address or select a current player to attack.",
    button: "Attack Cat",
  },
};

const Players: React.FC = () => {
  const address = useAddress();
  const events = useContext(EventContext).events.filter(
    (e) =>
      !isOwnEvent(
        {
          type: e.eventName as EventProps["type"],
          data: e.data,
        },
        address
      )
  );

  return (
    <div className="space-y-2 mt-3 w-full max-h-48 overflow-auto">
      {events && events?.length > 0 ? (
        events?.map((e) => (
          <Event
            key={`${e.transaction.transactionHash}_${e.transaction.logIndex}`}
            type={e.eventName as EventProps["type"]}
            data={e.data}
          />
        ))
      ) : (
        <p>No events found</p>
      )}
    </div>
  );
};

const Modal: React.FC<ModalProps> = ({ isOpen, close, level }) => {
  const { refetch, targetAddress, setTargetAddress } = useContext(GameContext);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  if (!isOpen) return null;

  const text = modalText[level];

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-10 px-4">
      <div className="rounded-lg p-8 bg-neutral-900 w-full max-w-lg">
        <div className="flex items-start">
          <div className="max-w-sm">
            <h1 className="text-2xl font-bold leading-none">{text.title}</h1>
            <p className="text-gray-500 mt-4">{text?.description}</p>
          </div>
          <button className="ml-auto" onClick={close}>
            <Image src="/icons/close.svg" width={24} height={24} alt="Close" />
          </button>
        </div>
        {level !== 2 && (
          <>
            <div className="mt-8">
              <label
                className="font-bold text-neutral-300"
                htmlFor="wallet-address"
              >
                Enter Wallet address
              </label>
              <input
                className="w-full mt-3 border border-gray-500 bg-transparent rounded-xl p-4 font-medium placeholder:text-gray-500"
                id="wallet-address"
                placeholder="0x0..."
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
              />
            </div>
            <div className="mt-8">
              <p className="font-bold text-neutral-300">
                Or select a current player
              </p>
              <p className="text-xs text-gray-500">
                Click on an address to set it as your target.
              </p>
              <Players />
            </div>
          </>
        )}
        <div className="mt-4">
          <Web3Button
            className="!ml-auto !bg-white !text-black !border-0 !py-2 !h-auto !font-sans !min-w-0 !w-full"
            contractAddress={CONTRACT_ADDR}
            action={(contract) => {
              if (level === 1)
                return contract.erc1155.transfer(targetAddress, 0, 1);
              if (level === 2) return contract.erc1155.burn(1, 1);
              if (level === 3) return contract.call("attack", targetAddress);
            }}
            onError={(error) => setError(error)}
            onSubmit={() => setError(null)}
            onSuccess={() => {
              close();
              refetch();
            }}
          >
            {level === 1 && "Transfer"}
            {level === 2 && "Burn"}
            {level === 3 && "Attack"}
          </Web3Button>
        </div>
        {error && (
          <p className="mt-2 text-xs first-letter:capitalize text-red-400 max-w-xs text-center">
            {(error as TransactionError).reason}
          </p>
        )}
      </div>
    </div>
  );
};

type CatProps = {
  cat: NFT;
};

const colors = ["#B74AA4", "#4830A4", "#BFA3DA"];

const Cat: React.FC<CatProps> = ({ cat }) => {
  const [isOpen, setIsOpen] = useState(false);

  const level = (Number(cat.metadata.id) + 1) as 1 | 2 | 3;
  const color = colors[level - 1];

  const quantity = cat.quantityOwned;

  const openModal = useCallback(() => {
    setIsOpen(true);
    document.body.classList.add("overflow-hidden");
  }, [setIsOpen]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    document.body.classList.remove("overflow-hidden");
  }, [setIsOpen]);

  return (
    <>
      <Modal isOpen={isOpen} close={closeModal} level={level} />
      <div className="flex flex-col items-center rounded-lg w-80 relative">
        {quantity && (
          <span className="absolute top-2 right-2 bg-black text-xs font-bold text-white px-2 py-1 rounded-md">
            x{quantity}
          </span>
        )}
        <div
          className="border rounded-t-lg w-80 h-80"
          style={{ borderColor: color }}
        >
          <ThirdwebNftMedia width="240" height="240" metadata={cat.metadata} />
        </div>
        <div className="border border-t-0 rounded-b-lg border-gray-700 w-full py-4 px-8 flex flex-col items-center text-center">
          <p className="font-bold text-xs leading-tight" style={{ color }}>
            Level {level}
          </p>
          <p className="font-bold text-xl mt-2 mb-4 leading-tight">
            {cat.metadata.name}
          </p>
          <p className="text-xs font-semibold mb-6 text-gray-500">
            {cat.metadata.description}
          </p>
          <button
            type="button"
            className="!bg-white !text-black !border-0 !py-2.5 px-5 rounded-lg w-full font-semibold leading-6"
            style={{ minWidth: 200, height: 50 }}
            onClick={openModal}
          >
            {level === 1 && "Transfer"}
            {level === 2 && "Burn it"}
            {level === 3 && "Attack"}
          </button>
        </div>
      </div>
    </>
  );
};

export default Cat;
