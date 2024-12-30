export const ToastContent = ({ text }: { text: string }) => {
  return (
    <div className="whitespace-pre-line rounded-[8px] bg-black p-4 text-base leading-[20px] text-white">
      {text}
    </div>
  )
}
